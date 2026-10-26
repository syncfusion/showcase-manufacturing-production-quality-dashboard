import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FabComponent } from '@syncfusion/ej2-react-buttons';
import { SidebarComponent } from '@syncfusion/ej2-react-navigations';
import { AIAssistViewComponent, type PromptRequestEventArgs } from '@syncfusion/ej2-react-interactive-chat';
import { sampleAnswer } from '../domain/assistant';
import { useSession } from '../domain/session';

const SUGGESTIONS = ['Explain the OEE miss', 'List critical-path orders', 'Name the top defect code'];
type AssistSidebar = SidebarComponent;

export function PlantAssistant() {
  const { plant } = useSession();
  const assist = useRef<AIAssistViewComponent>(null);
  const sidebar = useRef<AssistSidebar | null>(null);
  const pending = useRef(0);
  const [open, setOpen] = useState(false);

  const onPrompt = (args: PromptRequestEventArgs) => {
    const request = ++pending.current;
    const answer = sampleAnswer(plant, args.prompt ?? '');
    window.setTimeout(() => {
      if (request !== pending.current) return;
      assist.current?.addPromptResponse(answer);
    }, 240);
  };

  const onChange = (args: { element: HTMLElement }) => {
    setOpen(args.element.classList.contains('e-open'));
  };

  const fab = (
    <FabComponent
      id="ask-plant-fab"
      target="body"
      position="BottomRight"
      iconCss="e-icons e-ai-chat"
      content="Ask the plant"
      cssClass="ask-plant-fab"
      onClick={() => sidebar.current?.show()}
    />
  );

  return (
    <>
      {createPortal(fab, document.body)}
      <SidebarComponent
        ref={sidebar}
        id="plant-assist"
        position="Right"
        type="Over"
        width="360px"
        enableDock={false}
        dockSize="0px"
        isOpen={open}
        showBackdrop={false}
        closeOnDocumentClick
        enableGestures={false}
        change={onChange}
        zIndex={1200}
      >
        <div id="plant-assist-panel">
          <div className="assist-head">
            <div>
              <h2 className="assist-title">Plant assistant</h2>
              <p className="assist-label">Sample AI, runs on the current session data, no external model</p>
            </div>
            <button type="button" className="assist-close" aria-label="Close assistant" onClick={() => sidebar.current?.hide()}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <AIAssistViewComponent
            ref={assist}
            height="100%"
            promptPlaceholder="Ask about this period"
            promptSuggestionsHeader="Sample questions"
            cssClass="plant-assist-view"
            promptSuggestions={SUGGESTIONS}
            promptRequest={onPrompt}
          />
        </div>
      </SidebarComponent>
    </>
  );
}
