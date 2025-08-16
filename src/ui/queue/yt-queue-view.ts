import {css, html, LitElement, nothing, type PropertyValues} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {parseYouTubeId} from '../../utils/youtube.ts';
import type {QueueEntryDto} from '../../../server/dto/QueueEntryDto.ts';

@customElement('yt-queue-view')
export class YtQueueView extends LitElement {

  connectedCallback() {
    super.connectedCallback();

    fetch('/api/queue/list')
      .then(res => res.json())
      .then(data => this.queue = data);
  }

  @property({attribute: false})
  queue: QueueEntryDto[] = [];

  @state()
  private newInput = '';

  socket: WebSocket | null = null;

  private addFromInput() {
    const id = parseYouTubeId(this.newInput) || (this.newInput.trim().length === 11 ? this.newInput.trim() : null);
    fetch('/api/queue/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: id,
      }),
    }).then(res => res.json())
      .then(data => {
        this.queue = data;
      });

    this.newInput = '';
  }

  private removeAt(index: number) {
    fetch('/api/queue/remove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index: index,
      }),
    }).then(res => res.json())
      .then(data => this.queue = data);
  }

  private vote(id: number, voteValue: number) {
    fetch('/api/queue/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: id,
        voteValue: voteValue,
      }),
    }).then(res => res.json())
      .then(data => {
        this.queue = data;
        console.log(data);
      });
  }

  private select(index: number) {
    console.log(index);
    //TODO make li bigger and show thumbnail e.g.
  }

  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    this.socket = new WebSocket("/ws");
    this.socket.onopen = () => {
      console.log("Connected to server");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "queueUpdate") {
        if(data.queue){
          this.queue = data.queue;
        }
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log("close");
      this.socket.close(); // 👈 clean close
    }
  }

  render() {
    return html`
      <div class="queue">
        <div class="add">
          <sl-input
            placeholder="Paste YouTube URL or ID"
            value=${this.newInput}
            @sl-input=${(e: any) => (this.newInput = e.target.value)}
            clearable
          ></sl-input>
          <sl-button variant="primary" @click=${() => this.addFromInput()}>Add</sl-button>
        </div>

        ${this.queue.length > 0 ? html`
          <div class="current-playing">
            <div class="now-playing">
              <div class="text">
                <strong>Currently Playing</strong>
                <span>${this.queue[0].title}</span>
              </div>
              <img src="${this.queue[0].thumbnail}" alt="Thumbnail">
            </div>
            <sl-progress-bar value="50"></sl-progress-bar>
          </div>` : nothing}

        ${this.queue.length === 0
          ? html`<p class="empty">No videos in queue yet. Add one to get started.</p>`
          : html`
            <ul class="test">
              ${this.queue.map((id, i) => {
                if (i === 0) {
                  return nothing;
                }
                return html`
                  <li>
                    <div class="meta" @click=${() => this.select(i)}>
                      <span class="idx">${i}.</span>
                      <span class="id">${id.title}</span>
                      <span>Votes: ${id.votes}</span>
                    </div>
                    <div class="actions">
                      <sl-icon-button name="arrow-up" label="Move up"
                                      @click=${() => this.vote(i, 1)}></sl-icon-button>
                      <sl-icon-button name="arrow-down" label="Move down"
                                      @click=${() => this.vote(i, -1)}></sl-icon-button>
                      <sl-icon-button name="trash" label="Remove" @click=${() => this.removeAt(i)}></sl-icon-button>
                    </div>
                  </li>`;
              })}
            </ul>`}
      </div>
    `;
  }

  static styles = css`

      :host {
          display: block;
          box-sizing: border-box;
      }

      .current-playing {
          padding: 5px;
          width: 95%;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          align-items: center;
          border: 1px solid #ccc;
          border-radius: 8px;
          margin: 4px;
      }

      .current-playing sl-progress-bar {
          --height: 2px;
          width: 97%;
      }

      .now-playing {
          display: flex;
          align-items: center; /* vertically center text and image */
          justify-content: space-between;
          padding: 8px 12px;
          max-width: 500px;
      }

      .now-playing .text {
          display: flex;
          flex-direction: column; /* stack strong and span vertically */
      }

      .now-playing img {
          width: 80px; /* adjust size as needed */
          height: auto;
          border-radius: 4px;
      }

      .add {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
      }

      sl-input::part(base) {
          width: 100%;
      }

      .empty {
          opacity: 0.7;
          padding: 12px 0;
      }

      .test {
          list-style: none;
          padding: 0;
          margin: 12px 0 0;
          display: grid;
          gap: 8px;
      }

      li {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
          background: var(--sl-color-neutral-100);
          border-radius: 8px;
          padding: 8px;
          color: black;
          margin-left: 8px;
          margin-right: 8px;
      }

      li.active {
          outline: 2px solid var(--sl-color-primary-500);
      }

      .meta {
          display: grid;
          grid-template-columns: min-content auto 20%;
          gap: 8px;
          align-items: center;
          text-align: left;
          overflow: hidden;
          cursor: pointer;
      }

      .meta .id {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }

  `;
}


declare global {
  interface HTMLElementTagNameMap {
    'yt-queue-view': YtQueueView;
  }
}
