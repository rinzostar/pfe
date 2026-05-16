import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { getCourse } from '../lib/db';
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
    if (!courseId) {
      setLoading(false);
      return;
    }
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    const { data } = await getCourse(Number(courseId));
    if (data) {
      setCourse(data);
      if (mode === 'summarize') {
        generateSummary(data);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
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
      setMessages([{ role: 'assistant', text: 'Désolé, je n\'ai pas pu générer le résumé. Vérifiez votre connexion ou réessayez.' }]);
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    body { font-family: 'Inter', -apple-system, sans-serif; padding: 60px; max-width: 800px; margin: 0 auto; line-height: 1.8; color: #1a1d29; }
    h1 { color: #1a1d29; border-bottom: 4px solid #6366f1; padding-bottom: 20px; font-size: 32px; font-weight: 800; }
    .meta { color: #6b7280; margin-bottom: 40px; font-size: 16px; font-weight: 600; }
    .content { white-space: pre-wrap; font-size: 17px; color: #3d4250; line-height: 1.9; }
    .footer { margin-top: 60px; padding-top: 30px; border-top: 2px solid #e5e7eb; font-size: 14px; color: #9ca3af; text-align: center; font-weight: 600; }
    .print-btn { position: fixed; top: 30px; right: 30px; padding: 16px 32px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 14px; cursor: pointer; font-size: 16px; font-weight: 700; box-shadow: 0 8px 32px rgba(102,126,234,0.3); transition: all 0.2s; }
    .print-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(102,126,234,0.4); }
    @media print { .no-print { display: none; } body { padding: 40px; } }
  </style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">🖨️ Imprimer / Enregistrer PDF</button>
  <h1>📚 Résumé du cours</h1>
  <div class="meta">
    <strong style="font-size: 20px;">${courseName}</strong><br><br>
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
    if (!inputText.trim()) return;
    const question = inputText.trim();
    setChatBusy(true);
    setMessages(prev => [...prev, { role: 'student', text: question }]);
    setInputText('');
    try {
      const answer = await chatWithCourse({
        mode: 'chat',
        question,
        course: { title: course?.title || '', content: course?.content || '', yt_url: course?.yt_url || '' },
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
            <button className="btn" onClick={generatePDF} style={{ padding: '12px 24px' }}>
              📄 Exporter en PDF
            </button>
          </div>
          <p className="sub">
            {course ? `Cours: ${course.title}` : 'Discutez avec l\'IA et générez des résumés de vos cours.'}
          </p>
        </div>
      </FadeIn>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28 }}>
        <FadeIn delay={100}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 650, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '22px 28px', borderBottom: '2px solid var(--line)', background: 'linear-gradient(135deg, #f0f9ff 0%, #fff 100%)' }}>
              <div className="row between">
                <div className="row" style={{ gap: 14 }}>
                  <span style={{ fontSize: 32 }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>Tuteur IA</div>
                    <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>{course?.title || 'Prêt à vous aider'}</div>
                  </div>
                </div>
                <button className="btn ghost xs" onClick={() => { setMessages([]); setSummary(''); }}>
                  🗑️ Effacer
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {loading && mode === 'summarize' ? (
                <div className="empty" style={{ background: 'transparent', border: 'none' }}>
                  <div className="spinner" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--accent)', margin: '0 auto 20px' }} />
                  <div style={{ fontSize: 16, color: 'var(--ink-3)', fontWeight: 600 }}>Génération du résumé en cours...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="empty" style={{ background: 'transparent', border: 'none' }}>
                  <span className="empty-icon">✨</span>
                  <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Commencez la conversation</div>
                  <div style={{ fontSize: 15, color: 'var(--ink-3)', fontWeight: 500 }}>Posez une question sur ce cours ou demandez un résumé.</div>
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
                  <div className="row" style={{ gap: 6, padding: '8px 0' }}>
                    <div style={{ width: 8, height: 8, background: 'var(--ink-4)', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                    <div style={{ width: 8, height: 8, background: 'var(--ink-4)', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }} />
                    <div style={{ width: 8, height: 8, background: 'var(--ink-4)', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '18px 28px', borderTop: '2px solid var(--line)', background: 'var(--surface)' }}>
              <div className="row" style={{ gap: 14 }}>
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

        <div>
          <FadeIn delay={200} direction="right">
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 18, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚡</span> Actions rapides
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button className="btn ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => course && generateSummary(course)}>
                  <span>📝</span> Générer un résumé
                </button>
                <button className="btn ghost sm" style={{ justifyContent: 'flex-start' }} onClick={generatePDF}>
                  <span>📄</span> Exporter PDF
                </button>
                {course && (
                  <button className="btn ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => router.push(`/module?id=${course.moduleId}`)}>
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
              <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14, color: 'var(--ink-2)', fontWeight: 600 }}>
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
