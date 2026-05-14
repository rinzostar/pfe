import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { listCoursesByModule } from '../lib/db';
import { chatWithCourse } from '../lib/aiClient';
import { toast } from '../lib/toast';
import FadeIn from '../components/FadeIn';

export default function Chat() {
  const router = useRouter();
  const { user } = useAuth();
  const { courseId, courseTitle, mode } = router.query;
  
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    const { data: courses } = await listCoursesByModule(courseId);
    const c = (courses || []).find(x => x.id === Number(courseId));
    if (c) {
      setCourse(c);
      if (mode === 'summarize') {
        generateSummary(c);
      } else {
        setLoading(false);
      }
    }
  };

  const generateSummary = async (c) => {
    setLoading(true);
    try {
      const answer = await chatWithCourse({
        mode: 'summary',
        question: '',
        course: { title: c.title, content: c.content || '', yt_url: c.yt_url || '' },
      });
      setSummary(answer);
      setMessages([{ role: 'assistant', text: `📋 Résumé de "${c.title}":\n\n${answer}` }]);
    } catch (err) {
      toast.error('Échec de la génération du résumé');
    }
    setLoading(false);
  };

  const generatePDF = () => {
    if (!summary && !messages.length) {
      toast.error('Aucun contenu à exporter');
      return;
    }
    
    const content = summary || messages.map(m => m.text).join('\n\n');
    const courseName = course?.title || courseTitle || 'Cours';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Résumé - ${courseName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Inter', -apple-system, sans-serif; padding: 50px; max-width: 800px; margin: 0 auto; line-height: 1.7; color: #1a1a2e; }
    h1 { color: #1a1a2e; border-bottom: 4px solid #667eea; padding-bottom: 16px; font-size: 28px; font-weight: 800; }
    .meta { color: #7a7a9a; margin-bottom: 32px; font-size: 15px; font-weight: 500; }
    .content { white-space: pre-wrap; font-size: 16px; color: #4a4a68; line-height: 1.8; }
    .footer { margin-top: 50px; padding-top: 24px; border-top: 2px solid #e8e8f5; font-size: 13px; color: #a0a0bf; text-align: center; font-weight: 500; }
    .print-btn { position: fixed; top: 24px; right: 24px; padding: 14px 28px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 15px; font-weight: 700; box-shadow: 0 8px 24px rgba(102,126,234,0.3); transition: all 0.2s; }
    .print-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(102,126,234,0.4); }
    @media print { .no-print { display: none; } body { padding: 30px; } }
  </style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">🖨️ Imprimer / Enregistrer PDF</button>
  <h1>📚 Résumé du cours</h1>
  <div class="meta">
    <strong style="font-size: 18px;">${courseName}</strong><br><br>
    Généré le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}
  </div>
  <div class="content">${content.replace(/\n/g, '<br>')}</div>
  <div class="footer">
    Généré par Lumen AI · Plateforme e-learning
  </div>
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    toast.success('📄 Document PDF prêt !');
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !course) return;
    const question = inputText.trim();
    setChatBusy(true);
    setMessages(prev => [...prev, { role: 'student', text: question }]);
    setInputText('');
    
    try {
      const answer = await chatWithCourse({
        mode: 'chat',
        question,
        course: { title: course.title, content: course.content || '', yt_url: course.yt_url || '' },
      });
      setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      toast.error('Échec de la réponse IA');
    }
    setChatBusy(false);
  };

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Assistant IA</div>
          <div className="row between">
            <h1>🤖 Chat & Résumé</h1>
            <button className="btn gradient-3" onClick={generatePDF}>
              📄 Exporter en PDF
            </button>
          </div>
          <p className="sub">
            {course ? `Cours: ${course.title}` : 'Discutez avec l\'IA et générez des résumés de vos cours.'}
          </p>
        </div>
      </FadeIn>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
        {/* Main Chat Area */}
        <FadeIn delay={100}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 600, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '2px solid var(--line)', background: 'var(--bg-2)' }}>
              <div className="row between">
                <div className="row" style={{ gap: 12 }}>
                  <span style={{ fontSize: 28 }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Tuteur IA</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>{course?.title || 'Prêt à vous aider'}</div>
                  </div>
                </div>
                <button className="btn ghost xs" onClick={() => { setMessages([]); setSummary(''); }}>
                  🗑️ Effacer
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {loading && mode === 'summarize' ? (
                <div className="empty" style={{ background: 'transparent', border: 'none' }}>
                  <div className="spinner" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--accent)', margin: '0 auto 20px' }} />
                  <div style={{ fontSize: 15, color: 'var(--ink-3)', fontWeight: 500 }}>Génération du résumé en cours...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="empty" style={{ background: 'transparent', border: 'none' }}>
                  <span className="empty-icon">✨</span>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Commencez la conversation</div>
                  <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>Posez une question sur ce cours ou demandez un résumé.</div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`ai-msg ${m.role}`}>
                    <div className="role-label">{m.role === 'assistant' ? 'IA' : 'Vous'}</div>
                    {m.text}
                  </div>
                ))
              )}
              {chatBusy && (
                <div className="ai-msg assistant">
                  <div className="role-label">IA</div>
                  <div className="row" style={{ gap: 6, padding: '6px 0' }}>
                    <div style={{ width: 6, height: 6, background: 'var(--ink-4)', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                    <div style={{ width: 6, height: 6, background: 'var(--ink-4)', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }} />
                    <div style={{ width: 6, height: 6, background: 'var(--ink-4)', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }} />
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '2px solid var(--line)', background: 'var(--surface)' }}>
              <div className="row" style={{ gap: 12 }}>
                <input
                  className="input"
                  placeholder="💬 Posez une question..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  disabled={chatBusy}
                  style={{ flex: 1 }}
                />
                <button className="btn" onClick={sendMessage} disabled={chatBusy || !inputText.trim()}>
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Sidebar */}
        <div>
          <FadeIn delay={200} direction="right">
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 18, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚡</span> Actions rapides
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => course && generateSummary(course)}>
                  <span>📝</span> Générer un résumé
                </button>
                <button className="btn ghost sm" style={{ justifyContent: 'flex-start' }} onClick={generatePDF}>
                  <span>📄</span> Exporter PDF
                </button>
                {course && (
                  <button className="btn ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => router.push(`/module?id=${course.module_id}`)}>
                    <span>📚</span> Retour au module
                  </button>
                )}
              </div>
            </div>
          </FadeIn>
          
          <FadeIn delay={300} direction="right">
            <div className="card">
              <h3 style={{ marginBottom: 18, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>💡</span> Astuces
              </h3>
              <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
                <li>Demandez des explications simples</li>
                <li>Demandez des exemples concrets</li>
                <li>Demandez un plan d'étude personnalisé</li>
                <li>Générez des questions d'examen</li>
                <li>Demandez des analogies mémotechniques</li>
              </ul>
            </div>
          </FadeIn>
        </div>
      </div>
    </Layout>
  );
}
