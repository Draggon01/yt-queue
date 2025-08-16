import {css, html, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import './queue/yt-queue-view';
import './queue/yt-player';

@customElement('overview-view')
export class OverviewView extends LitElement {

  @state()
  mode: 'view' | 'queue' | 'none' = 'none';

  render() {
    switch (this.mode) {
      case 'none':
        return html`
          <div class="modeChoice">
            <sl-button variant="danger" @click="${() => this.mode = 'view'}">Viewing Mode</sl-button>
            <sl-button variant="primary" @click="${() => this.mode = 'queue'}">Queue Mode</sl-button>
          </div>
        `;
      case 'view':
        return html`
          <sl-button variant="neutral" 
                     @click="${() => this.mode = 'none'}">
            Back</sl-button>
          <yt-player></yt-player>
        `;
      case 'queue':
        return html`
          <sl-button variant="neutral"
                     @click="${() => this.mode = 'none'}">
            Back</sl-button>
          <yt-queue-view></yt-queue-view>
        `;
    }


  }

  static styles = css`
      .modeChoice {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 12px;
          flex-direction: column;
      }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'overview-view': OverviewView;
  }
}
