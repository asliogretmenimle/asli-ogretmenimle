import { Icon } from './icons'
import { clearCanvas, defaultSettings, setState, useStore, type Settings } from './store'

type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings]

const UI: [BoolKey, string, string][] = [
  ['showSidebar', 'Parçalar kenar çubuğu', 'shapes'],
  ['sidebarStartsOpen', 'Kenar çubuğu açık başlasın', 'chevron'],
  ['fullscreen', 'Tam ekran düğmesi', 'fullscreen'],
  ['undo', 'Geri al ve yinele', 'undo'],
  ['reset', 'Tuvali temizleme', 'reset'],
  ['grid', 'Izgara seçimi', 'grid'],
  ['download', 'Görüntü dışa aktarma', 'screenshot'],
  ['pinch', 'İki parmakla yakınlaştırma', 'zoom-in'],
  ['largeUi', 'Büyük arayüz', 'zoom-in'],
  ['advancedColors', 'Gelişmiş renkler', 'palette'],
]

const TILES: [BoolKey, string, string][] = [
  ['copy', 'Kopyala ve yapıştır', 'copy'],
  ['del', 'Parça silme', 'trash'],
  ['rotate', 'Parça döndürme', 'rotate'],
  ['snap', 'Yapışma', 'grid'],
  ['music', 'Müzik araçları', 'applications'],
  ['merge', 'Parça birleştirme', 'copy'],
]

const DISPLAY: [BoolKey, string, string][] = [
  ['sound', 'Ses efektleri', 'applications'],
  ['confetti', 'Konfeti', 'lightbulb'],
  ['altColors', 'Alternatif parça renkleri', 'palette'],
  ['contrast', 'Yüksek karşıtlık', 'settings'],
  ['handdrawn', 'Elle çizilmiş görünüm', 'pen'],
]

function Toggle({ label, icon, checked, onChange }: { label: string; icon: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="pp-form-row">
      <Icon name={icon} size={20} />
      <span>{label}</span>
      <input className="pp-toggle" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="pp-control" />
    </label>
  )
}

export function SettingsPanel() {
  const bg = useStore((s) => s.bg)
  const size = useStore((s) => s.canvasSize)
  const w = useStore((s) => s.canvasW)
  const h = useStore((s) => s.canvasH)
  const authoring = useStore((s) => s.authoring)
  const settings = useStore((s) => s.settings)
  const hasTiles = useStore((s) => s.tiles.length > 0)
  const set = (patch: Partial<Settings>) => setState((s) => ({ settings: { ...s.settings, ...patch } }))
  const all = (v: boolean) =>
    set(Object.fromEntries([...UI, ...TILES, ...DISPLAY].filter(([k]) => k !== 'showSidebar').map(([k]) => [k, v])) as Partial<Settings>)

  const rows = (list: [BoolKey, string, string][]) => list.map(([k, label, icon]) => <Toggle key={k} label={label} icon={icon} checked={settings[k]} onChange={(v) => set({ [k]: v })} />)

  return (
    <div className="pp-customise">
      <div className="pp-section-block">
        <label className="pp-form-row color">
          <Icon name="palette" size={20} />
          <span>Arka plan</span>
          <input type="color" value={bg} onChange={(e) => setState({ bg: e.target.value })} />
          <span className="pp-swatch-lg" style={{ background: bg }} />
        </label>
        <label className="pp-form-row">
          <Icon name="geo-rectangle" size={20} />
          <span>Tuval boyutu</span>
          <select className="pp-input" value={size} onChange={(e) => setState({ canvasSize: e.target.value as typeof size })}>
            <option value="infinite">Sonsuz</option>
            <option value="fixed">Sabit</option>
            <option value="notebook">Defter</option>
          </select>
        </label>
        {size !== 'infinite' && (
          <label className="pp-form-row">
            <Icon name="move" size={20} />
            <span>{size === 'fixed' ? 'Boyutlar' : 'Genişlik'}</span>
            <input className="pp-input pair" aria-label="Genişlik" type="number" min={5} max={100} step={1} value={w} onChange={(e) => setState({ canvasW: Math.min(100, Math.max(5, Number(e.target.value) || 5)) })} />
            {size === 'fixed' && <input className="pp-input pair" aria-label="Yükseklik" type="number" min={5} max={100} step={1} value={h} onChange={(e) => setState({ canvasH: Math.min(100, Math.max(5, Number(e.target.value) || 5)) })} />}
          </label>
        )}
        <Toggle label="Yazar modu" icon="edit" checked={authoring} onChange={(v) => setState({ authoring: v })} />
        <p className="pp-caption">
          Tuvalin özelliklerini ve arayüzünü özelleştirin. Yazar modunda kenar çubuğundaki kategorilerin yanındaki kutularla öğrencilerin göreceği parçaları seçebilirsiniz.
        </p>
        {settings.reset && (
          <button
            type="button"
            className="pp-btn pp-btn-small pp-btn-red"
            disabled={!hasTiles}
            onClick={() => {
              if (window.confirm('Tuvaldeki her şey silinsin mi? (Geri al ile geri getirebilirsiniz.)')) clearCanvas()
            }}
          >
            Tuvali temizle
          </button>
        )}
      </div>
      {authoring && (
        <div className="pp-advanced">
          <p className="pp-caption">
            <button type="button" className="pp-link" onClick={() => all(true)}>Tümünü aç</button> •{' '}
            <button type="button" className="pp-link" onClick={() => all(false)}>Tümünü kapat</button> •{' '}
            <button type="button" className="pp-link" onClick={() => setState({ settings: defaultSettings })}>Varsayılanlar</button>
          </p>
          <h4>Arayüz ve özellikler</h4>
          {rows(UI)}
          <label className="pp-form-row">
            <Icon name="pen" size={20} />
            <span>Çizim araçları</span>
            <select className="pp-input" value={settings.drawing} onChange={(e) => set({ drawing: e.target.value as Settings['drawing'] })}>
              <option value="default">Varsayılan</option>
              <option value="limited">Kalem ve silgi</option>
              <option value="colored">Renkli kalemler</option>
            </select>
          </label>
          <label className="pp-form-row">
            <Icon name="more" size={20} />
            <span>Eylem çubuğu</span>
            <select className="pp-input" value={settings.actionbar} onChange={(e) => set({ actionbar: e.target.value as Settings['actionbar'] })}>
              <option value="custom">Parçanın üstünde</option>
              <option value="always">Araç çubuğunun üstünde</option>
              <option value="never">Gizli</option>
            </select>
          </label>
          <h4>Parça eylemleri</h4>
          {rows(TILES)}
          <h4>Görünüm ve ses</h4>
          {rows(DISPLAY)}
        </div>
      )}
    </div>
  )
}
