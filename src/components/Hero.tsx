import { MapScene } from './MapScene'

export function Hero() {
  return (
    <section className="hero" aria-labelledby="brand-title">
      <div className="hero-canvas" aria-hidden={false}>
        <MapScene />
      </div>
      <div className="hero-copy">
        <h1 id="brand-title" className="brand">
          三國志
        </h1>
        <p className="tagline">正史為本 · 疆域與興衰</p>
        <p className="lede">
          以陳壽《三國志》及裴注為據，呈現黃巾之亂至西晉一統（一八四—二八〇）之勢力消長。
        </p>
      </div>
    </section>
  )
}
