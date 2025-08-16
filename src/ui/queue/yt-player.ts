import {css, html, LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

@customElement('yt-player')
export class YtPlayer extends LitElement {
  @property() videoId?: string;
  @property({type: Boolean, reflect: true}) disabled = false;

  player: YT.Player | undefined;

  @state()
  mainPlayer: boolean = false;

  waiting: boolean = false;

  socket: WebSocket | null = null;

  static styles = css`
      :host {
          display: block;
          box-sizing: border-box;
      }

      #player {
          height: 60vh;
      }

      .player {
          display: grid;
          gap: 12px;
          height: 100%;
      }

      .frame {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          display: grid;
          place-items: center;
      }

      .placeholder {
          color: #aaa;
          font-size: 0.95rem;
          text-align: center;
          padding: 16px;
      }

      iframe {
          width: 100%;
          height: 100%;
          display: block;
      }

      .controls {
          display: flex;
          gap: 8px;
          justify-content: center;
      }
  `;

  firstUpdated() {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    this.player = new YT.Player(this.renderRoot.querySelector('#player')!, {
      height: '500',
      width: '450',
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1,
        modestbranding: 1,      // removes big YouTube logo
        rel: 0,                 // no "related videos" from other channels
        playsinline: 1,      // ✅ important for iOS/mobile so it plays inline
      },
      events: {
        onReady: () => this._loadCurrent(),
        onStateChange: (event: YT.OnStateChangeEvent) => {
          if (event.data === YT.PlayerState.ENDED) {
            console.log('video ended');
            if (this.mainPlayer) {
              this._videoEnded();
            }
          }
        },
      },
    });

    this.socket = new WebSocket('/ws');
    this.socket.onopen = () => {
      console.log('Connected to server');
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
      if (data.type === 'queueUpdate') {
        if (data.queue && this.waiting && data.queue[0]) {
          this.videoId = data.queue[0].videoId;
          this.player?.loadVideoById(this.videoId!);
          this.player?.playVideo();
          this.waiting = false;
        }
      }
      if (data.type === 'masterAccepted') {
        this.mainPlayer = true;
      }
      if (data.type === 'masterRemoved') {
        this.mainPlayer = false;
      }
    };
  }

  updated(changedProps: Map<string, any>) {
    if (changedProps.has('videoId') && this.player && this.videoId) {
      console.log(this.videoId);
      this.player.loadVideoById(this.videoId);
    }
  }

  render() {
    return html`
      <div class="player">
        <div id="player"></div>
        <div class="controls">
          <sl-button variant="primary" @click=${() => {
            this._videoEnded();
          }} pill>Next
          </sl-button>
        </div>
      </div>
      <sl-button @click="${() => this._loadCurrent()}">Reload</sl-button>
      <sl-button @click="${() => this._claimMaster()}">Claim Master</sl-button>
      <div>Master ${this.mainPlayer ? 'true' : 'false'}</div>
    `;
  }

  private _loadCurrent() {
    fetch('/api/queue/current')
      .then(res => res.json())
      .then(data => {
        if (!data.videoId) {
          this.waiting = true;
        }
        this.videoId = data.videoId;
      });
  }

  private _videoEnded() {
    fetch('/api/queue/list')
      .then(json => json.json())
      .then(data => {
        if (data.length > 1) {
          //get next video to play
          this.videoId = data[1].videoId;
        } else if (data.length <= 1) {
          this.waiting = true;
          this.player!.loadVideoById(''); // sometimes throws
        }
        //remove already played video
        void fetch('/api/queue/remove', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            index: 0,
          }),
        });
      });
  }

  private _claimMaster() {
    console.log(this.socket);
    this.socket?.send(JSON.stringify({
      type: 'claimMaster',
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'yt-player': YtPlayer;
  }
}
