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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFolder, 
  faFolderPlus, 
  faFile, 
  faPlus,
  faTrash,
  faTimes 
} from '@fortawesome/free-solid-svg-icons';

// Configure Monaco Editor with languages
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false
});

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.Latest,
  allowNonTsExtensions: true
});

// Configure TypeScript
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false
});

monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.Latest,
  allowNonTsExtensions: true,
  allowJs: true,
  checkJs: true
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
        case 'scss':
        case 'less':
          return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker', import.meta.url));
        case 'html':
        case 'handlebars':
        case 'razor':
          return new Worker(new URL('monaco-editor/esm/vs/language/html/html.worker', import.meta.url));
        case 'python':
          return new Worker(new URL('monaco-editor/esm/vs/basic-languages/python/python.worker', import.meta.url));
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

// Language configurations
const LANGUAGE_CONFIGS = {
  javascript: {
    name: 'JavaScript',
    defaultCode: '// Write your JavaScript code here\nconsole.log("Hello, World!");',
    runnable: true
  },
  typescript: {
    name: 'TypeScript',
    defaultCode: '// Write your TypeScript code here\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);',
    runnable: true
  },
  python: {
    name: 'Python',
    defaultCode: '# Write your Python code here\nprint("Hello, World!")',
    runnable: false
  },
  java: {
    name: 'Java',
    defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    runnable: false
  },
  cpp: {
    name: 'C++',
    defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
    runnable: false
  },
  csharp: {
    name: 'C#',
    defaultCode: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}',
    runnable: false
  },
  ruby: {
    name: 'Ruby',
    defaultCode: '# Write your Ruby code here\nputs "Hello, World!"',
    runnable: false
  },
  go: {
    name: 'Go',
    defaultCode: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    runnable: false
  },
  rust: {
    name: 'Rust',
    defaultCode: 'fn main() {\n    println!("Hello, World!");\n}',
    runnable: false
  },
  php: {
    name: 'PHP',
    defaultCode: '<?php\n\necho "Hello, World!";',
    runnable: false
  },
  sql: {
    name: 'SQL',
    defaultCode: '-- Write your SQL query here\nSELECT "Hello, World!" AS greeting;',
    runnable: false
  },
  html: {
    name: 'HTML',
    defaultCode: '<!DOCTYPE html>\n<html>\n<head>\n    <title>Hello World</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>',
    runnable: false
  },
  css: {
    name: 'CSS',
    defaultCode: '/* Write your CSS code here */\nbody {\n    font-family: Arial, sans-serif;\n    color: #333;\n}',
    runnable: false
  },
  json: {
    name: 'JSON',
    defaultCode: '{\n    "greeting": "Hello, World!"\n}',
    runnable: false
  },
  xml: {
    name: 'XML',
    defaultCode: '<?xml version="1.0" encoding="UTF-8"?>\n<greeting>Hello, World!</greeting>',
    runnable: false
  },
  markdown: {
    name: 'Markdown',
    defaultCode: '# Hello, World!\n\nThis is a markdown document.',
    runnable: false
  }
};

const SUPPORTED_LANGUAGES = Object.entries(LANGUAGE_CONFIGS).map(([id, config]) => ({
  id,
  name: config.name
}));

const Editor = ({ sessionId }) => {
  const editorRef = useRef(null);
  const [ydoc] = useState(new Y.Doc());
  const [provider, setProvider] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [editorContent, setEditorContent] = useState(LANGUAGE_CONFIGS.javascript.defaultCode);
  const [fileStructure, setFileStructure] = useState({
    type: 'folder',
    name: 'root',
    expanded: true,
    children: [
      {
        type: 'folder',
        name: 'src',
        expanded: false,
        children: [
          {
            type: 'file',
            name: 'index.js',
            content: '// Main entry point\nconsole.log("Hello from index.js");'
          },
          {
            type: 'folder',
            name: 'components',
            expanded: false,
            children: [
              {
                type: 'file',
                name: 'App.js',
                content: '// App component\nconsole.log("Hello from App.js");'
              }
            ]
          }
        ]
      },
      {
        type: 'file',
        name: 'README.md',
        content: '# Project Documentation\n\nWelcome to the project!'
      }
    ]
  });
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });

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
    // Update editor content when language changes
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
        // Only set default code if the editor is empty
        if (model.getValue().trim() === '') {
          model.setValue(LANGUAGE_CONFIGS[language].defaultCode);
        }
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
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
    setOutput(''); // Clear output when language changes
  };

  const runCode = async () => {
    if (!LANGUAGE_CONFIGS[language].runnable) {
      setOutput(`Running ${LANGUAGE_CONFIGS[language].name} code is not supported yet.`);
      return;
    }

    setIsExecuting(true);
    setOutput('Executing...');
    const code = editorRef.current.getValue();
    let outputLogs = [];

    try {
      switch (language) {
        case 'javascript':
          await executeJavaScript(code, outputLogs);
          break;
        case 'typescript':
          await executeTypeScript(code, outputLogs);
          break;
        default:
          outputLogs.push(`Language '${LANGUAGE_CONFIGS[language].name}' execution is not supported yet.`);
      }
    } catch (error) {
      outputLogs.push(`Runtime Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }

    setOutput(outputLogs.join('\n') || 'No output');
  };

  const executeJavaScript = async (code, outputLogs) => {
    // Create a safe execution context
    const customConsole = createCustomConsole(outputLogs);
    
    const context = {
      console: customConsole,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
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
  };

  const executeTypeScript = async (code, outputLogs) => {
    // For now, we'll just execute TypeScript as JavaScript
    // In a production environment, you'd want to properly compile TypeScript first
    await executeJavaScript(code, outputLogs);
  };

  const createCustomConsole = (outputLogs) => ({
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
  });

  const handleCreateFile = (parentFolder) => {
    const newFileName = prompt('Enter file name:');
    if (!newFileName) return;

    const fileExtension = newFileName.includes('.') ? '' : '.js';
    const fullFileName = newFileName + fileExtension;

    const newFile = {
      type: 'file',
      name: fullFileName,
      content: LANGUAGE_CONFIGS[fileExtension.slice(1)]?.defaultCode || '',
      parent: parentFolder
    };

    const addFileToFolder = (folder) => {
      if (folder === parentFolder) {
        return {
          ...folder,
          children: [...(folder.children || []), newFile],
          expanded: true // Auto-expand the folder when adding a file
        };
      }
      if (folder.children) {
        return {
          ...folder,
          children: folder.children.map(child => 
            child.type === 'folder' ? addFileToFolder(child) : child
          )
        };
      }
      return folder;
    };

    setFileStructure(prev => {
      if (!parentFolder || parentFolder === prev) {
        return {
          ...prev,
          children: [...(prev.children || []), newFile]
        };
      }
      return addFileToFolder(prev);
    });
  };

  const handleCreateFolder = (parentFolder) => {
    const newFolderName = prompt('Enter folder name:');
    if (!newFolderName) return;

    const newFolder = {
      type: 'folder',
      name: newFolderName,
      expanded: true,
      children: [],
      parent: parentFolder
    };

    const addFolderToFolder = (folder) => {
      if (folder === parentFolder) {
        return {
          ...folder,
          children: [...(folder.children || []), newFolder],
          expanded: true // Auto-expand the folder when adding a subfolder
        };
      }
      if (folder.children) {
        return {
          ...folder,
          children: folder.children.map(child => 
            child.type === 'folder' ? addFolderToFolder(child) : child
          )
        };
      }
      return folder;
    };

    setFileStructure(prev => {
      if (!parentFolder || parentFolder === prev) {
        return {
          ...prev,
          children: [...(prev.children || []), newFolder]
        };
      }
      return addFolderToFolder(prev);
    });
  };

  const handleDelete = (item) => {
    if (selectedItem === item) {
      setSelectedItem(null);
      setEditorContent('');
    }

    const deleteFromFolder = (folder) => {
      if (folder.children) {
        return {
          ...folder,
          children: folder.children
            .filter(child => child !== item)
            .map(child => child.type === 'folder' ? deleteFromFolder(child) : child)
        };
      }
      return folder;
    };

    setFileStructure(prev => deleteFromFolder(prev));
  };

  const toggleFolder = (folder) => {
    const toggleFolderInStructure = (node) => {
      if (node === folder) {
        return {
          ...node,
          expanded: !node.expanded
        };
      }
      if (node.type === 'folder' && node.children) {
        return {
          ...node,
          children: node.children.map(child => toggleFolderInStructure(child))
        };
      }
      return node;
    };

    setFileStructure(prev => toggleFolderInStructure(prev));
  };

  // Add click handler for files
  const handleFileClick = (file) => {
    setSelectedItem(file);
    setEditorContent(file.content || '');
    const fileExtension = file.name.split('.').pop();
    if (LANGUAGE_CONFIGS[fileExtension]) {
      setLanguage(fileExtension);
    }
  };

  const handleContextMenu = (event, item) => {
    event.preventDefault();
    setContextMenu({ visible: true, x: event.pageX, y: event.pageY, item });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleDeleteContextMenu = () => {
    handleDelete(contextMenu.item);
    handleCloseContextMenu();
  };

  const renderContextMenu = () => {
    if (!contextMenu.visible) return null;
    return (
      <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
        <button onClick={handleDeleteContextMenu}>Delete</button>
        <button onClick={() => handleCreateFile(contextMenu.item)}>New File</button>
        <button onClick={() => handleCreateFolder(contextMenu.item)}>New Folder</button>
      </div>
    );
  };

  const renderFileStructure = (node) => {
    return (
      <div key={node.name} className={`file-item ${selectedItem === node ? 'selected' : ''}`}> 
        <div 
          className={`file-item-header ${selectedItem === node ? 'selected' : ''}`}
          onClick={() => {
            if (node.type === 'file') {
              handleFileClick(node);
            } else {
              toggleFolder(node);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          <FontAwesomeIcon 
            icon={node.type === 'folder' ? faFolder : faFile} 
            className={`file-icon ${node.type}-icon`}
          />
          <span className="file-name">{node.name}</span>
          <div className="file-item-actions">
            {node.type === 'folder' && (
              <>
                <button 
                  className="action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateFile(node);
                  }}
                  title="New File"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
                <button 
                  className="action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateFolder(node);
                  }}
                  title="New Folder"
                >
                  <FontAwesomeIcon icon={faFolderPlus} />
                </button>
              </>
            )}
            <button 
              className="delete-button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node);
              }}
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        </div>
        {node.type === 'folder' && node.expanded && (
          <div className="folder-content">
            {node.children.map(renderFileStructure)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="editor-container">
      {renderContextMenu()}
      <div className="file-explorer">
        <div className="file-explorer-header">
          <h3>Explorer</h3>
          <div className="file-explorer-actions">
            <button 
              className="file-action-button"
              onClick={() => handleCreateFile(fileStructure)}
              title="New File"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button 
              className="file-action-button"
              onClick={() => handleCreateFolder(fileStructure)}
              title="New Folder"
            >
              <FontAwesomeIcon icon={faFolderPlus} />
            </button>
          </div>
        </div>
        <div className="file-explorer-content">
          {fileStructure.children.map(renderFileStructure)}
        </div>
      </div>

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
            <button 
              className="run-button" 
              onClick={runCode}
              disabled={isExecuting || !LANGUAGE_CONFIGS[language].runnable}
            >
              {isExecuting ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
        <MonacoEditor
          width="100%"
          height="80vh"
          language={language}
          theme="vs-dark"
          value={editorContent}
          onChange={value => setEditorContent(value)}
          editorDidMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{ 
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            formatOnPaste: true,
            formatOnType: true,
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            folding: true,
            links: true,
            contextmenu: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true
          }}
        />
        <div className="output-container">
          <h3>Output:</h3>
          <pre className={isExecuting ? 'executing' : ''}>
            {output || 'No output yet. Click "Run" to execute your code.'}
          </pre>
        </div>
      </div>

      {isChatOpen && provider && currentUser && (
        <div className="chat-popup">
          <div className="chat-header">
            <h3>Chat</h3>
            <button className="close-chat-button" onClick={toggleChat}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <Chat ydoc={ydoc} currentUser={currentUser} />
        </div>
      )}
    </div>
  );
};

export default Editor;