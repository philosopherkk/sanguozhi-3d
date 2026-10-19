import { AppHeader } from './components/AppHeader'
import { MapStage } from './components/MapStage'
import { PeoplePanel } from './components/PeoplePanel'
import { TimelinePanel } from './components/TimelinePanel'
import { YearScrubber } from './components/YearScrubber'
import { MapViewProvider } from './state/MapViewContext'
import { YearProvider } from './state/YearContext'
import './App.css'

function App() {
  return (
    <YearProvider>
      <MapViewProvider>
        <div className="app-shell">
          <AppHeader />
          <YearScrubber />

          <section className="timeline-rail" aria-label="年表">
            <TimelinePanel compact rail />
          </section>

          <div className="app-shell__stage">
            <MapStage />
            <aside className="people-rail" aria-label="人物介紹">
              <PeoplePanel compact />
            </aside>
          </div>

          <footer className="app-footer">
            <p>
              據《三國志》裴注、《後漢書》、《資治通鑑》、《晉書》· 不用《三國演義》·
              州界示意
            </p>
          </footer>
        </div>
      </MapViewProvider>
    </YearProvider>
  )
}

export default App
