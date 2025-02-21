import { useState, useRef, useEffect } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from 'y-monaco';
import MonacoEditor from 'react-monaco-editor';
import { Awareness } from 'y-protocols/awareness';
import Chat from './Chat';

const Editor = ({ sessionId }) => {
  const editorRef = useRef(null);
  const [ydoc] = useState(new Y.Doc());
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    if (!sessionId || !editorRef.current) return;

    const awareness = new Awareness(ydoc);
    const webrtcProvider = new WebrtcProvider(`codeconnect-${sessionId}`, ydoc, {
      signaling: ['ws://localhost:3000/signaling'],
      password: null,
      awareness
    });

    setProvider(webrtcProvider);

    const editor = editorRef.current;
    const type = ydoc.getText('monaco');
    
    const binding = new MonacoBinding(
      type,
      editor.getModel(),
      new Set([editor]),
      awareness
    );

    return () => {
      binding.destroy();
      webrtcProvider.destroy();
      ydoc.destroy();
    };
  }, [sessionId, ydoc]);

  return (
    <div className="editor-container">
      <MonacoEditor
        width="70%"
        height="100vh"
        language="javascript"
        theme="vs-dark"
        editorDidMount={(editor) => {
          editorRef.current = editor;
        }}
        options={{ minimap: { enabled: false } }}
      />
      {provider && <Chat ydoc={ydoc} />}
    </div>
  );
};

export default Editor;