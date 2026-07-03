import { useState, useEffect } from 'react'
import { supabase, type BlogPost } from '../config/supabase'
import './AdminPage.css'

const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD

type View = 'dashboard' | 'posts' | 'editor'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [view, setView] = useState<View>('dashboard')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null)
  const [saving, setSaving] = useState(false)

  // Check session
  useEffect(() => {
    if (sessionStorage.getItem('lumma_admin') === 'true') setAuthed(true)
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pwInput === ADMIN_PW) {
      setAuthed(true)
      sessionStorage.setItem('lumma_admin', 'true')
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  useEffect(() => {
    if (authed) fetchPosts()
  }, [authed])

  async function fetchPosts() {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
    setPosts(data || [])
  }

  function openEditor(post?: BlogPost) {
    setEditingPost(post || {
      title: '', slug: '', excerpt: '', content: '',
      cover_url: '', category: 'Market News', published: false,
    })
    setView('editor')
  }

  async function savePost() {
    if (!editingPost?.title || !editingPost?.slug) return
    setSaving(true)

    const payload = {
      title: editingPost.title,
      slug: editingPost.slug,
      excerpt: editingPost.excerpt || '',
      content: editingPost.content || '',
      cover_url: editingPost.cover_url || '',
      category: editingPost.category || 'Market News',
      published: editingPost.published ?? false,
      updated_at: new Date().toISOString(),
    }

    if (editingPost.id) {
      await supabase.from('blog_posts').update(payload).eq('id', editingPost.id)
    } else {
      await supabase.from('blog_posts').insert({ ...payload, created_at: new Date().toISOString() })
    }

    setSaving(false)
    setView('posts')
    fetchPosts()
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    await supabase.from('blog_posts').delete().eq('id', id)
    fetchPosts()
  }

  async function togglePublish(post: BlogPost) {
    await supabase.from('blog_posts').update({ published: !post.published }).eq('id', post.id)
    fetchPosts()
  }

  // ── Login Gate ──
  if (!authed) {
    return (
      <div className="ad">
        <div className="ad-login">
          <img src="/images/lumma.svg" alt="Lumma" className="ad-login-logo" />
          <h2>Admin Access</h2>
          <p>Enter the admin password to continue.</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false) }}
              className={pwError ? 'error' : ''}
              autoFocus
            />
            {pwError && <span className="ad-login-err">Incorrect password</span>}
            <button type="submit">Sign In</button>
          </form>
        </div>
      </div>
    )
  }

  // ── Dashboard ──
  return (
    <div className="ad">
      <aside className="ad-side">
        <div className="ad-side-logo">
          <img src="/images/lumma.svg" alt="Lumma" />
          <span>Admin</span>
        </div>
        <nav className="ad-side-nav">
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')} type="button">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </button>
          <button className={view === 'posts' || view === 'editor' ? 'active' : ''} onClick={() => setView('posts')} type="button">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Blog Posts
          </button>
        </nav>
        <button className="ad-side-out" onClick={() => { sessionStorage.removeItem('lumma_admin'); setAuthed(false) }} type="button">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </aside>

      <main className="ad-main">
        {view === 'dashboard' && (
          <>
            <div className="ad-header">
              <h1>Dashboard</h1>
              <span className="ad-header-sub">Overview of your platform</span>
            </div>
            <div className="ad-cards">
              <div className="ad-card">
                <span className="ad-card-label">Total Users</span>
                <span className="ad-card-val">—</span>
                <span className="ad-card-note">Waitlist signups</span>
              </div>
              <div className="ad-card">
                <span className="ad-card-label">Volume</span>
                <span className="ad-card-val">—</span>
                <span className="ad-card-note">Total bridge volume</span>
              </div>
              <div className="ad-card">
                <span className="ad-card-label">Transactions</span>
                <span className="ad-card-val">—</span>
                <span className="ad-card-note">All-time swaps</span>
              </div>
              <div className="ad-card">
                <span className="ad-card-label">Blog Posts</span>
                <span className="ad-card-val">{posts.length}</span>
                <span className="ad-card-note">{posts.filter(p => p.published).length} published</span>
              </div>
            </div>
          </>
        )}

        {view === 'posts' && (
          <>
            <div className="ad-header">
              <h1>Blog Posts</h1>
              <button className="ad-header-btn" onClick={() => openEditor()} type="button">+ New Post</button>
            </div>
            <div className="ad-table">
              <div className="ad-table-head">
                <span>Title</span><span>Category</span><span>Status</span><span>Date</span><span>Actions</span>
              </div>
              {posts.length === 0 ? (
                <div className="ad-table-empty">No posts yet. Create your first one.</div>
              ) : posts.map(post => (
                <div key={post.id} className="ad-table-row">
                  <span className="ad-table-title">{post.title}</span>
                  <span className="ad-table-cat">{post.category}</span>
                  <span className={`ad-table-status ${post.published ? 'pub' : 'draft'}`}>
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                  <span className="ad-table-date">
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="ad-table-actions">
                    <button onClick={() => togglePublish(post)} type="button">{post.published ? 'Unpublish' : 'Publish'}</button>
                    <button onClick={() => openEditor(post)} type="button">Edit</button>
                    <button className="del" onClick={() => deletePost(post.id)} type="button">Delete</button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'editor' && editingPost && (
          <>
            <div className="ad-header">
              <h1>{editingPost.id ? 'Edit Post' : 'New Post'}</h1>
              <div className="ad-header-actions">
                <button className="ad-header-btn ghost" onClick={() => setView('posts')} type="button">Cancel</button>
                <button className="ad-header-btn" onClick={savePost} disabled={saving} type="button">
                  {saving ? 'Saving...' : 'Save Post'}
                </button>
              </div>
            </div>
            <div className="ad-editor">
              <div className="ad-field">
                <label>Title</label>
                <input value={editingPost.title || ''} onChange={e => setEditingPost({ ...editingPost, title: e.target.value })} placeholder="Post title" />
              </div>
              <div className="ad-field">
                <label>Slug</label>
                <input value={editingPost.slug || ''} onChange={e => setEditingPost({ ...editingPost, slug: e.target.value })} placeholder="url-friendly-slug" />
              </div>
              <div className="ad-row">
                <div className="ad-field">
                  <label>Category</label>
                  <select value={editingPost.category || ''} onChange={e => setEditingPost({ ...editingPost, category: e.target.value })}>
                    {['FAQs','Wallets','Analytics','Watchlist','Portfolio','Market News','Twitter'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="ad-field">
                  <label>Cover Image URL</label>
                  <input value={editingPost.cover_url || ''} onChange={e => setEditingPost({ ...editingPost, cover_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="ad-field">
                <label>Excerpt</label>
                <textarea rows={2} value={editingPost.excerpt || ''} onChange={e => setEditingPost({ ...editingPost, excerpt: e.target.value })} placeholder="Short summary..." />
              </div>
              <div className="ad-field">
                <label>Content</label>
                <textarea rows={14} value={editingPost.content || ''} onChange={e => setEditingPost({ ...editingPost, content: e.target.value })} placeholder="Write your article content..." />
              </div>
              <label className="ad-check">
                <input type="checkbox" checked={editingPost.published || false} onChange={e => setEditingPost({ ...editingPost, published: e.target.checked })} />
                Publish immediately
              </label>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
