import { useState, useRef, useEffect } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from 'y-monaco';
import MonacoEditor from 'react-monaco-editor';
import * as monaco from 'monaco-editor';
import { Awareness } from 'y-protocols/awareness';
import { supabase } from '../supabaseClient';
import Chat from './Chat';
import './Editor.css';

// Configure Monaco Editor with languages
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false
});

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.Latest,
  allowNonTsExtensions: true
});

// Set up the worker paths
window.MonacoEnvironment = {
  getWorker(moduleId, label) {
    const getWorkerModule = (label) => {
      switch (label) {
        case 'typescript':
        case 'javascript':
          return new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url));
        case 'json':
          return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url));
        case 'css':
          return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker', import.meta.url));
        case 'html':
          return new Worker(new URL('monaco-editor/esm/vs/language/html/html.worker', import.meta.url));
        default:
          return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
      }
    };
    try {
      return getWorkerModule(label);
    } catch (e) {
      console.error(`Failed to load worker for ${label}:`, e);
      return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
    }
  }
};

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'csharp', name: 'C#' },
  { id: 'php', name: 'PHP' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'swift', name: 'Swift' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'sql', name: 'SQL' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'json', name: 'JSON' },
  { id: 'xml', name: 'XML' },
  { id: 'markdown', name: 'Markdown' }
];

const Editor = ({ sessionId }) => {
  const editorRef = useRef(null);
  const [ydoc] = useState(new Y.Doc());
  const [provider, setProvider] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        return;
      }
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCurrentUser(profile);
        }
      }
    };

    fetchUser();
  }, []);

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

  useEffect(() => {
    // Configure editor when language changes
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    alert('Session ID copied to clipboard!');
  };

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const runCode = async () => {
    const code = editorRef.current.getValue();
    let result = '';
    let outputLogs = [];

    // Create a custom console for output capture
    const customConsole = {
      log: (...args) => {
        const output = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        outputLogs.push(output);
      },
      error: (...args) => {
        const output = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        outputLogs.push(`Error: ${output}`);
      },
      warn: (...args) => {
        const output = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        outputLogs.push(`Warning: ${output}`);
      }
    };

    try {
      switch (language) {
        case 'javascript':
          // Create a safe execution context
          const context = {
            console: customConsole,
            setTimeout,
            clearTimeout,
            setInterval,
            clearInterval,
            // Add any other safe globals you want to expose
          };
          
          // Wrap the code to capture the return value
          const wrappedCode = `
            try {
              ${code}
            } catch (error) {
              console.error(error.message);
            }
          `;
          
          // Execute the code in the context
          const func = new Function('context', `
            with (context) {
              ${wrappedCode}
            }
          `);
          
          await func(context);
          break;
          
        case 'python':
          result = 'Python execution not implemented yet.';
          break;
          
        default:
          result = 'Language not supported for execution.';
      }
    } catch (error) {
      outputLogs.push(`Runtime Error: ${error.message}`);
    }

    // Format and set the output
    const formattedOutput = [
      ...outputLogs,
      result ? `\nResult: ${result}` : ''
    ].filter(Boolean).join('\n');

    setOutput(formattedOutput || 'No output');
  };

  return (
    <div className="editor-container">
      <div className="editor-card">
        <div className="editor-header">
          <h2>Code Editor</h2>
          <select 
            className="language-selector"
            value={language}
            onChange={handleLanguageChange}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
          <div className="button-container">
            <button className="chat-toggle-button" onClick={toggleChat}>Chat</button>
            <button className="copy-session-button" onClick={copySessionId}>Copy Session ID</button>
            <button className="run-button" onClick={runCode}>Run</button>
          </div>
        </div>
        <MonacoEditor
          width="100%"
          height="80vh"
          language={language}
          theme="vs-dark"
          editorDidMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{ 
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            formatOnPaste: true,
            formatOnType: true
          }}
        />
        <div className="output-container">
          <h3>Output:</h3>
          <pre>{output}</pre>
        </div>
      </div>
      {isChatOpen && provider && currentUser && (
        <div className="chat-popup">
          <Chat ydoc={ydoc} currentUser={currentUser} />
        </div>
      )}
    </div>
  );
};

export default Editor;