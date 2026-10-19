import { Hero } from './components/Hero'
import './App.css'

function App() {
  return (
    <div className="app">
      <Hero />
      <footer className="site-footer">
        <p>
          史料依據：《三國志》（裴松之注）、《後漢書》、《資治通鑑》、《晉書》。不用《三國演義》。
        </p>
        <p className="phase">階段一 · 專案骨架</p>
      </footer>
    </div>
  )
}

export default App
