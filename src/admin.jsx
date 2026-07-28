import React, { useState, useEffect } from 'react';
import { Copy, Download, Upload, Trash2, Plus } from 'lucide-react';

const IsopodGameAdmin = () => {
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [questions, setQuestions] = useState({
    easy: [],
    hard: [],
    hell: []
  });

  const [currentDifficulty, setCurrentDifficulty] = useState('easy');
  const [editingIndex, setEditingIndex] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJSON, setImportJSON] = useState('');

  // 本地存儲初始化
  useEffect(() => {
    const saved = localStorage.getItem('isopod_questions');
    if (saved) {
      try {
        setQuestions(JSON.parse(saved));
      } catch (e) {
        console.log('無法載入本地數據');
      }
    }
  }, []);

  // 保存到本地存儲
  useEffect(() => {
    localStorage.setItem('isopod_questions', JSON.stringify(questions));
  }, [questions]);

  // 密碼驗證
  const handleLogin = () => {
    const ADMIN_PASSWORD = 'admin123'; // 改成你自己的密碼
    if (adminPassword === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setAdminPassword('');
    } else {
      alert('密碼錯誤！');
      setAdminPassword('');
    }
  };

  // 新增題目
  const addQuestion = () => {
    const newQuestion = {
      q: { type: 'text', content: '新題目' },
      options: [
        { type: 'text', content: '選項A' },
        { type: 'text', content: '選項B' },
        { type: 'text', content: '選項C' },
        { type: 'text', content: '選項D' }
      ],
      correct: 0,
      explanation: ''
    };
    setQuestions({
      ...questions,
      [currentDifficulty]: [...questions[currentDifficulty], newQuestion]
    });
  };

  // 刪除題目
  const deleteQuestion = (index) => {
    const updated = questions[currentDifficulty].filter((_, i) => i !== index);
    setQuestions({
      ...questions,
      [currentDifficulty]: updated
    });
    setEditingIndex(null);
  };

  // 更新題目
  const updateQuestion = (index, updatedQuestion) => {
    const updated = [...questions[currentDifficulty]];
    updated[index] = updatedQuestion;
    setQuestions({
      ...questions,
      [currentDifficulty]: updated
    });
  };

  // 處理圖片上傳
  const handleImageUpload = (file, questionIndex, isQuestionImage, optionIndex) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('圖片大小不能超過5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const question = questions[currentDifficulty][questionIndex];

      if (isQuestionImage) {
        question.q = { type: 'image', content: base64 };
      } else {
        question.options[optionIndex] = { type: 'image', content: base64 };
      }

      updateQuestion(questionIndex, question);
    };
    reader.readAsDataURL(file);
  };

  // 導出JSON
  const exportJSON = () => {
    const dataStr = JSON.stringify(questions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'isopod_questions.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // 導入JSON
  const handleImport = () => {
    try {
      const imported = JSON.parse(importJSON);
      setQuestions(imported);
      alert('導入成功！');
      setShowImportModal(false);
      setImportJSON('');
    } catch (e) {
      alert('JSON格式錯誤！');
    }
  };

  // 複製JSON到剪貼板
  const copyToClipboard = () => {
    const dataStr = JSON.stringify(questions, null, 2);
    navigator.clipboard.writeText(dataStr).then(() => {
      alert('已複製到剪貼板！');
    });
  };

  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f1eb 0%, #eae3d9 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
          
          .login-container {
            background: white;
            padding: '40px';
            border-radius: '12px';
            box-shadow: '0 8px 16px rgba(0,0,0,0.15)';
            max-width: '400px';
            width: '100%';
            text-align: 'center';
          }

          .login-title {
            font-family: 'Playfair Display', serif;
            font-size: '36px';
            color: '#6b5d54';
            margin-bottom: '30px';
          }

          .login-input {
            width: '100%';
            padding: '12px';
            margin-bottom: '20px';
            border: '2px solid #ddd';
            border-radius: '8px';
            font-size: '16px';
            box-sizing: 'border-box';
          }

          .login-btn {
            width: '100%';
            padding: '12px';
            background: '#8b9a7a';
            color: 'white';
            border: 'none';
            border-radius: '8px';
            font-size: '16px';
            font-weight: '600';
            cursor: 'pointer';
            transition: 'all 0.3s';
          }

          .login-btn:hover {
            background: '#6b7d5a';
            transform: 'translateY(-2px)';
          }
        `}</style>

        <div className="login-container">
          <div className="login-title">🔐 管理後台</div>
          <input
            type="password"
            className="login-input"
            placeholder="輸入管理員密碼"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          <button className="login-btn" onClick={handleLogin}>
            登入
          </button>
        </div>
      </div>
    );
  }

  const currentQuestions = questions[currentDifficulty];
  const editingQuestion = editingIndex !== null ? currentQuestions[editingIndex] : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f1eb 0%, #eae3d9 100%)',
      padding: '20px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
    }}>
      <style>{`
        .admin-container {
          max-width: '1400px';
          margin: '0 auto';
          display: 'grid';
          grid-template-columns: '1fr 1fr';
          gap: '20px';
        }

        .panel {
          background: 'white';
          border-radius: '12px';
          padding: '20px';
          box-shadow: '0 4px 6px rgba(0,0,0,0.1)';
        }

        .header {
          display: 'flex';
          justify-content: 'space-between';
          align-items: 'center';
          margin-bottom: '20px';
          border-bottom: '2px solid #eee';
          padding-bottom: '15px';
        }

        .title {
          font-size: '24px';
          font-weight: '700';
          color: '#6b5d54';
        }

        .difficulty-tabs {
          display: 'flex';
          gap: '10px';
          margin-bottom: '20px';
        }

        .tab-btn {
          padding: '8px 16px';
          border: '2px solid #ddd';
          background: 'white';
          border-radius: '6px';
          cursor: 'pointer';
          font-weight: '600';
          color: '#6b5d54';
          transition: 'all 0.3s';
        }

        .tab-btn.active {
          background: '#8b9a7a';
          color: 'white';
          border-color: '#8b9a7a';
        }

        .questions-list {
          max-height: '600px';
          overflow-y: 'auto';
        }

        .question-item {
          padding: '12px';
          border: '2px solid #ddd';
          border-radius: '8px';
          margin-bottom: '10px';
          cursor: 'pointer';
          transition: 'all 0.3s';
        }

        .question-item:hover {
          border-color: '#8b9a7a';
          background: '#f9f9f9';
        }

        .question-item.active {
          background: '#e8f0eb';
          border-color: '#8b9a7a';
        }

        .question-preview {
          font-size: '14px';
          color: '#666';
          overflow: 'hidden';
          text-overflow: 'ellipsis';
          white-space: 'nowrap';
        }

        .editor-section {
          margin-bottom: '20px';
        }

        .editor-label {
          font-weight: '600';
          color: '#6b5d54';
          margin-bottom: '8px';
          display: 'block';
        }

        .editor-input {
          width: '100%';
          padding: '10px';
          border: '2px solid #ddd';
          border-radius: '6px';
          font-size: '14px';
          font-family: 'inherit';
          box-sizing: 'border-box';
          margin-bottom: '10px';
        }

        .editor-textarea {
          width: '100%';
          padding: '10px';
          border: '2px solid #ddd';
          border-radius: '6px';
          font-size: '14px';
          font-family: 'inherit';
          box-sizing: 'border-box';
          min-height: '80px';
          resize: 'vertical';
        }

        .type-toggle {
          display: 'flex';
          gap: '10px';
          margin-bottom: '10px';
        }

        .toggle-btn {
          padding: '6px 12px';
          border: '2px solid #ddd';
          background: 'white';
          border-radius: '6px';
          cursor: 'pointer';
          font-size: '12px';
          transition: 'all 0.3s';
        }

        .toggle-btn.active {
          background: '#8b9a7a';
          color: 'white';
          border-color: '#8b9a7a';
        }

        .image-preview {
          max-width: '100px';
          max-height: '100px';
          border-radius: '6px';
          margin-top: '10px';
          object-fit: 'contain';
        }

        .button-group {
          display: 'flex';
          gap: '10px';
          flex-wrap: 'wrap';
          margin-top: '20px';
        }

        .btn {
          padding: '10px 16px';
          border: 'none';
          border-radius: '6px';
          font-size: '14px';
          font-weight: '600';
          cursor: 'pointer';
          transition: 'all 0.3s';
          display: 'flex';
          align-items: 'center';
          gap: '6px';
        }

        .btn-primary {
          background: '#8b9a7a';
          color: 'white';
        }

        .btn-primary:hover {
          background: '#6b7d5a';
          transform: 'translateY(-2px)';
        }

        .btn-danger {
          background: '#e74c3c';
          color: 'white';
        }

        .btn-danger:hover {
          background: '#c0392b';
        }

        .btn-secondary {
          background: '#95a5a6';
          color: 'white';
        }

        .btn-secondary:hover {
          background: '#7f8c8d';
        }

        .option-editor {
          background: '#f9f9f9';
          padding: '12px';
          border-radius: '6px';
          margin-bottom: '10px';
          border: '1px solid #eee';
        }

        .correct-answer-group {
          display: 'flex';
          gap: '10px';
          align-items: 'center';
          flex-wrap: 'wrap';
        }

        .correct-answer-group label {
          display: 'flex';
          align-items: 'center';
          gap: '6px';
          font-size: '14px';
          cursor: 'pointer';
        }

        .preview-panel {
          background: '#f5f5f5';
          padding: '20px';
          border-radius: '8px';
          margin-top: '20px';
          min-height: '400px';
        }

        .preview-question {
          font-size: '18px';
          font-weight: '600';
          color: '#6b5d54';
          margin-bottom: '20px';
          line-height: '1.6';
        }

        .preview-option {
          padding: '12px';
          border: '2px solid #ddd';
          border-radius: '6px';
          margin-bottom: '10px';
          cursor: 'pointer';
          transition: 'all 0.3s';
          background: 'white';
        }

        .preview-option:hover {
          border-color: '#8b9a7a';
          background: '#f9f9f9';
        }

        .preview-option.correct {
          border-color: '#27ae60';
          background: '#ecf0f1';
        }

        .modal-overlay {
          position: 'fixed';
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 'rgba(0,0,0,0.5)';
          display: 'flex';
          align-items: 'center';
          justify-content: 'center';
          z-index: 1000;
        }

        .modal {
          background: 'white';
          padding: '30px';
          border-radius: '12px';
          max-width: '500px';
          width: '90%';
          max-height: '80vh';
          overflow-y: 'auto';
        }

        .modal-title {
          font-size: '20px';
          font-weight: '700';
          margin-bottom: '20px';
          color: '#6b5d54';
        }

        .modal-textarea {
          width: '100%';
          height: '300px';
          padding: '12px';
          border: '2px solid #ddd';
          border-radius: '6px';
          font-family: 'monospace';
          font-size: '12px';
          box-sizing: 'border-box';
          margin-bottom: '15px';
        }

        @media (max-width: 1024px) {
          .admin-container {
            grid-template-columns: '1fr';
          }
        }
      `}</style>

      <div className="admin-container">
        {/* 左側：題目列表編輯 */}
        <div className="panel">
          <div className="header">
            <div className="title">🐛 題目編輯</div>
            <button className="btn btn-primary" onClick={() => setIsLoggedIn(false)}>
              登出
            </button>
          </div>

          <div className="difficulty-tabs">
            {['easy', 'hard', 'hell'].map(diff => (
              <button
                key={diff}
                className={`tab-btn ${currentDifficulty === diff ? 'active' : ''}`}
                onClick={() => {
                  setCurrentDifficulty(diff);
                  setEditingIndex(null);
                }}
              >
                {diff === 'easy' && '簡單'}
                {diff === 'hard' && '困難'}
                {diff === 'hell' && '地獄'}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" onClick={addQuestion} style={{ marginBottom: '15px' }}>
            <Plus size={16} /> 新增題目
          </button>

          <div className="questions-list">
            {currentQuestions.map((q, idx) => (
              <div
                key={idx}
                className={`question-item ${editingIndex === idx ? 'active' : ''}`}
                onClick={() => setEditingIndex(idx)}
              >
                <div style={{ fontWeight: '600', marginBottom: '5px' }}>第 {idx + 1} 題</div>
                <div className="question-preview">
                  {q.q.type === 'text' ? q.q.content : '[圖片題目]'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側：編輯器 */}
        <div className="panel">
          {editingQuestion ? (
            <>
              <div className="header">
                <div className="title">編輯題目 #{editingIndex + 1}</div>
              </div>

              {/* 題目編輯 */}
              <div className="editor-section">
                <label className="editor-label">題目</label>
                <div className="type-toggle">
                  <button
                    className={`toggle-btn ${editingQuestion.q.type === 'text' ? 'active' : ''}`}
                    onClick={() => {
                      const updated = { ...editingQuestion };
                      updated.q = { type: 'text', content: '新題目' };
                      updateQuestion(editingIndex, updated);
                    }}
                  >
                    文字
                  </button>
                  <button
                    className={`toggle-btn ${editingQuestion.q.type === 'image' ? 'active' : ''}`}
                    onClick={() => {
                      const updated = { ...editingQuestion };
                      updated.q = { type: 'image', content: '' };
                      updateQuestion(editingIndex, updated);
                    }}
                  >
                    圖片
                  </button>
                </div>

                {editingQuestion.q.type === 'text' ? (
                  <input
                    type="text"
                    className="editor-input"
                    value={editingQuestion.q.content}
                    onChange={(e) => {
                      const updated = { ...editingQuestion };
                      updated.q.content = e.target.value;
                      updateQuestion(editingIndex, updated);
                    }}
                    placeholder="輸入題目文字"
                  />
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], editingIndex, true)}
                    />
                    {editingQuestion.q.content && (
                      <img src={editingQuestion.q.content} alt="question" className="image-preview" />
                    )}
                  </>
                )}
              </div>

              {/* 選項編輯 */}
              {[0, 1, 2, 3].map(optIdx => (
                <div key={optIdx} className="editor-section">
                  <label className="editor-label">
                    選項 {String.fromCharCode(65 + optIdx)}
                  </label>
                  <div className="type-toggle">
                    <button
                      className={`toggle-btn ${editingQuestion.options[optIdx].type === 'text' ? 'active' : ''}`}
                      onClick={() => {
                        const updated = { ...editingQuestion };
                        updated.options[optIdx] = { type: 'text', content: '選項' };
                        updateQuestion(editingIndex, updated);
                      }}
                    >
                      文字
                    </button>
                    <button
                      className={`toggle-btn ${editingQuestion.options[optIdx].type === 'image' ? 'active' : ''}`}
                      onClick={() => {
                        const updated = { ...editingQuestion };
                        updated.options[optIdx] = { type: 'image', content: '' };
                        updateQuestion(editingIndex, updated);
                      }}
                    >
                      圖片
                    </button>
                  </div>

                  {editingQuestion.options[optIdx].type === 'text' ? (
                    <input
                      type="text"
                      className="editor-input"
                      value={editingQuestion.options[optIdx].content}
                      onChange={(e) => {
                        const updated = { ...editingQuestion };
                        updated.options[optIdx].content = e.target.value;
                        updateQuestion(editingIndex, updated);
                      }}
                      placeholder={`選項 ${String.fromCharCode(65 + optIdx)}`}
                    />
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], editingIndex, false, optIdx)}
                      />
                      {editingQuestion.options[optIdx].content && (
                        <img src={editingQuestion.options[optIdx].content} alt={`option ${optIdx}`} className="image-preview" />
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* 正確答案 */}
              <div className="editor-section">
                <label className="editor-label">正確答案</label>
                <div className="correct-answer-group">
                  {[0, 1, 2, 3].map(idx => (
                    <label key={idx}>
                      <input
                        type="radio"
                        name="correct"
                        checked={editingQuestion.correct === idx}
                        onChange={() => {
                          const updated = { ...editingQuestion };
                          updated.correct = idx;
                          updateQuestion(editingIndex, updated);
                        }}
                      />
                      {String.fromCharCode(65 + idx)}
                    </label>
                  ))}
                </div>
              </div>

              {/* 解釋 */}
              <div className="editor-section">
                <label className="editor-label">解釋說明</label>
                <textarea
                  className="editor-textarea"
                  value={editingQuestion.explanation}
                  onChange={(e) => {
                    const updated = { ...editingQuestion };
                    updated.explanation = e.target.value;
                    updateQuestion(editingIndex, updated);
                  }}
                  placeholder="輸入答案解釋"
                />
              </div>

              {/* 操作按鈕 */}
              <div className="button-group">
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm('確定刪除此題目？')) {
                      deleteQuestion(editingIndex);
                    }
                  }}
                >
                  <Trash2 size={16} /> 刪除
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
              選擇一個題目開始編輯
            </div>
          )}
        </div>
      </div>

      {/* 預覽面板 */}
      {editingQuestion && !previewMode && (
        <div style={{ marginTop: '20px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setPreviewMode(!previewMode)}
            style={{ marginBottom: '20px' }}
          >
            {previewMode ? '關閉預覽' : '顯示預覽'}
          </button>
        </div>
      )}

      {previewMode && editingQuestion && (
        <div className="panel" style={{ marginTop: '20px' }}>
          <div className="header">
            <div className="title">預覽（遊戲中的樣子）</div>
            <button
              className="btn btn-secondary"
              onClick={() => setPreviewMode(false)}
            >
              關閉
            </button>
          </div>
          <div className="preview-panel">
            {editingQuestion.q.type === 'text' && (
              <div className="preview-question">{editingQuestion.q.content}</div>
            )}
            {editingQuestion.q.type === 'image' && editingQuestion.q.content && (
              <div style={{ marginBottom: '20px' }}>
                <img src={editingQuestion.q.content} alt="question" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
              </div>
            )}

            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`preview-option ${editingQuestion.correct === idx ? 'correct' : ''}`}
              >
                <strong>{String.fromCharCode(65 + idx)}.</strong>{' '}
                {editingQuestion.options[idx].type === 'text' && editingQuestion.options[idx].content}
                {editingQuestion.options[idx].type === 'image' && editingQuestion.options[idx].content && (
                  <>
                    <img src={editingQuestion.options[idx].content} alt={`option ${idx}`} style={{ maxHeight: '60px', marginLeft: '10px', borderRadius: '4px' }} />
                  </>
                )}
              </div>
            ))}

            {editingQuestion.explanation && (
              <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '6px', fontSize: '14px', color: '#2e7d32' }}>
                <strong>解釋：</strong> {editingQuestion.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 導出/導入面板 */}
      <div className="panel" style={{ marginTop: '20px' }}>
        <div className="header">
          <div className="title">📤 導出/導入</div>
        </div>

        <div className="button-group">
          <button className="btn btn-primary" onClick={copyToClipboard}>
            <Copy size={16} /> 複製JSON到剪貼板
          </button>
          <button className="btn btn-primary" onClick={exportJSON}>
            <Download size={16} /> 下載JSON文件
          </button>
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            <Upload size={16} /> 導入JSON
          </button>
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '6px', fontSize: '13px' }}>
          <strong>使用方式：</strong><br />
          1. 編輯完所有題目後，點擊 "複製JSON到剪貼板"<br />
          2. 打開 isopod_game_with_leaderboard.jsx<br />
          3. 找到 const defaultQuestions <br />
          4. 替換成複製的JSON<br />
          5. git push 自動部署
        </div>
      </div>

      {/* 導入模態框 */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">導入JSON</div>
            <textarea
              className="modal-textarea"
              value={importJSON}
              onChange={(e) => setImportJSON(e.target.value)}
              placeholder="粘貼JSON代碼..."
            />
            <div className="button-group">
              <button className="btn btn-primary" onClick={handleImport}>
                確認導入
              </button>
              <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 統計信息 */}
      <div className="panel" style={{ marginTop: '20px' }}>
        <div className="title">📊 統計信息</div>
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          <div>簡單難度：{questions.easy.length} 題</div>
          <div>困難難度：{questions.hard.length} 題</div>
          <div>地獄難度：{questions.hell.length} 題</div>
          <div style={{ marginTop: '10px', fontWeight: '600' }}>
            總計：{questions.easy.length + questions.hard.length + questions.hell.length} 題
          </div>
        </div>
      </div>
    </div>
  );
};

export default IsopodGameAdmin;
