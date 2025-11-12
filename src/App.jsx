import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function App() {
  const [view, setView] = useState('auth') // auth | onboarding | dashboard
  const [token, setToken] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [profile, setProfile] = useState({ role: '', subject: '', goal: '' })
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [advice, setAdvice] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('decipline_auth')
    if (saved) {
      const { token } = JSON.parse(saved)
      setToken(token)
      setView('dashboard')
      fetchMe(token)
      fetchTasks(token)
    }
  }, [])

  const handleAuth = async (mode) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup' ? form : { email: form.email, password: form.password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setToken(data.token); setUser(data.user); setView('onboarding')
      localStorage.setItem('decipline_auth', JSON.stringify({ token: data.token }))
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const fetchMe = async (tk) => {
    try {
      const res = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${tk}` } })
      if (res.ok) {
        const me = await res.json(); setUser(me)
        if (me.role && me.subject) setView('dashboard')
      }
    } catch {}
  }

  const updateProfile = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setUser(data); setView('dashboard')
      await generateTasks()
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const fetchTasks = async (tk = token) => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, { headers: { Authorization: `Bearer ${tk}` } })
      if (res.ok) setTasks(await res.json())
    } catch {}
  }

  const generateTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/tasks/generate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      await res.json()
      await fetchTasks()
    } finally { setLoading(false) }
  }

  const toggleComplete = async (id, completed) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ completed })
    })
    if (res.ok) fetchTasks()
  }

  const upgrade = async () => {
    const res = await fetch(`${API_BASE}/billing/upgrade`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setUser(await res.json())
  }

  const getAdvice = async () => {
    setAdvice('')
    const res = await fetch(`${API_BASE}/ai/advice`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json();
    if (res.ok) setAdvice(data.advice); else setAdvice(data.detail || 'Failed')
  }

  const logout = () => {
    localStorage.removeItem('decipline_auth'); setUser(null); setToken(''); setView('auth'); setTasks([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-teal-50">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Decipline</h1>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button onClick={logout} className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded">Logout</button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {view === 'auth' && (
          <div className="bg-white rounded-xl shadow p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Welcome to Decipline</h2>
            <p className="text-sm text-gray-600 mb-4">Sign up or log in to get your personalized study plan.</p>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="space-y-3">
              <input className="w-full border rounded px-3 py-2" placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
              <input className="w-full border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
              <input type="password" className="w-full border rounded px-3 py-2" placeholder="Password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} />
              <div className="flex gap-3">
                <button onClick={()=>handleAuth('signup')} disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded">Sign Up</button>
                <button onClick={()=>handleAuth('login')} disabled={loading} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded">Log In</button>
              </div>
            </div>
          </div>
        )}

        {view === 'onboarding' && (
          <div className="bg-white rounded-xl shadow p-6 max-w-xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Tell us about your learning</h2>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select className="border rounded px-3 py-2" value={profile.role} onChange={e=>setProfile(p=>({...p, role:e.target.value}))}>
                <option value="">Who are you?</option>
                <option value="student">Student</option>
                <option value="professional">Professional</option>
                <option value="other">Other</option>
              </select>
              <input className="border rounded px-3 py-2" placeholder="Subject / Skill" value={profile.subject} onChange={e=>setProfile(p=>({...p, subject:e.target.value}))} />
              <input className="border rounded px-3 py-2" placeholder="Goal / Exam" value={profile.goal} onChange={e=>setProfile(p=>({...p, goal:e.target.value}))} />
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={updateProfile} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded" disabled={loading}>Continue</button>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="grid md:grid-cols-3 gap-6">
            <section className="md:col-span-2 bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Tasks</h2>
                <button onClick={generateTasks} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Auto-generate</button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-600">No tasks yet. Generate to get started.</p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map(t => (
                    <li key={t.id} className="border rounded p-3 flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${t.completed ? 'line-through text-gray-500' : ''}`}>{t.title}</p>
                        <p className="text-xs text-gray-500">{t.category} • {t.frequency}</p>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!t.completed} onChange={e=>toggleComplete(t.id, e.target.checked)} />
                        Done
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <aside className="space-y-6">
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold mb-2">Plan</h3>
                {user && (
                  <p className="text-sm text-gray-600">{user.premium ? 'Premium' : 'Free'} plan</p>
                )}
                {!user?.premium && (
                  <button onClick={upgrade} className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded">Upgrade to Premium</button>
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold mb-3">AI Study Advice</h3>
                <button onClick={getAdvice} className="mb-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded">Get Advice</button>
                <pre className="text-sm whitespace-pre-wrap text-gray-700">{advice}</pre>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
