import { useEffect, useState } from 'react'
import { CloudUpload, Plus, Trash2, UserPlus } from 'lucide-react'
import { loadSetting, saveSetting, studioCall, triggerDeploy, type StudioSettings } from '../api'
import { sb } from '../supabase'
import { Badge, Button, Callout, Card, Field, PageHead, Segmented, Select, TextArea, TextInput, Toggle, useConfirm, useToast } from '../ui'

interface AdminRow {
  user_id: string
  email: string
  role: 'owner' | 'editor'
  created_at: string
}

const MODELS = ['gpt-5', 'gpt-5-mini', 'gpt-5.1', 'gpt-4.1']

export function SettingsPage({ email }: { email: string }) {
  return (
    <div className="space-y-6">
      <PageHead title="Ayarlar" desc="Stüdyo asistanı, yöneticiler ve yayın ayarları." />
      <StudioCard />
      <PublishCard />
      <PasswordCard />
      <AdminsCard email={email} />
    </div>
  )
}

function StudioCard() {
  const toast = useToast()
  const [s, setS] = useState<StudioSettings | null>(null)
  const [status, setStatus] = useState<{ ok: boolean; model?: string; hasKey?: boolean; hasDeployHook?: boolean; error?: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadSetting<StudioSettings>('studio').then((v) => setS(v ?? {}), () => setS({}))
    studioCall<{ ok: boolean; model: string; hasKey: boolean; hasDeployHook: boolean }>({ action: 'status' }).then(setStatus, (e) => setStatus({ ok: false, error: (e as Error).message }))
  }, [])

  const save = async () => {
    setBusy(true)
    try {
      const cur = (await loadSetting<StudioSettings>('studio')) ?? {}
      await saveSetting('studio', { ...cur, model: s?.model, effort: s?.effort, instructions: s?.instructions })
      toast('Stüdyo ayarları kaydedildi')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Stüdyo asistanı" desc="OpenAI modeli ve kalıcı yönergeler" action={<Button variant="primary" size="sm" loading={busy} onClick={save} disabled={!s}>Kaydet</Button>}>
      {!s ? (
        <div className="h-40 animate-pulse rounded-xl bg-paper" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
            <span className="text-ink-soft">Bağlantı:</span>
            {!status ? <Badge>kontrol ediliyor…</Badge> : status.ok ? <Badge tone="green">Stüdyo sunucusu çalışıyor</Badge> : <Badge tone="red">Stüdyo sunucusuna ulaşılamıyor</Badge>}
            {status?.ok && (status.hasKey ? <Badge tone="green">OpenAI anahtarı tanımlı</Badge> : <Badge tone="red">OpenAI anahtarı yok</Badge>)}
          </div>
          {status && !status.ok && <Callout tone="amber" title="Kurulum gerekli">{status.error} — Ayrıntılı adımlar: docs/yonetim-paneli.md</Callout>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Model" help={`Boş bırakılırsa sunucudaki varsayılan kullanılır${status?.model ? ` (şu an: ${status.model})` : ''}.`}>
              <TextInput value={s.model ?? ''} onChange={(model) => setS({ ...s, model })} placeholder="gpt-5" list="studio-models" />
              <datalist id="studio-models">
                {MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            <Field label="Düşünme düzeyi" help="Yüksek düzey daha özenli ama daha yavaş üretir.">
              <Segmented
                value={s.effort ?? 'medium'}
                onChange={(effort) => setS({ ...s, effort })}
                options={[
                  { value: 'low', label: 'Hızlı' },
                  { value: 'medium', label: 'Dengeli' },
                  { value: 'high', label: 'Özenli' },
                ]}
              />
            </Field>
          </div>
          <Field label="Kalıcı yönergeler" help="Her üretimde asistana söylenir. Örn. “Her etkinlikte Aslı Öğretmen maskotu olsun”, “Renk paletinde pastel tonlar kullan”.">
            <TextArea value={s.instructions ?? ''} onChange={(instructions) => setS({ ...s, instructions })} minRows={4} placeholder="Örn. Oyunlarda süre baskısı kullanma; yanlış cevapta her zaman ipucu ver." />
          </Field>
        </div>
      )}
    </Card>
  )
}

function PublishCard() {
  const toast = useToast()
  const [s, setS] = useState<StudioSettings | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    loadSetting<StudioSettings>('studio').then((v) => setS(v ?? {}), () => setS({}))
  }, [])

  const deploy = async () => {
    setBusy(true)
    try {
      await triggerDeploy()
      toast('Site yeniden derleniyor. 1–3 dakika içinde arama motoru sayfaları güncellenir.', 'info')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  const setAuto = async (autoDeploy: boolean) => {
    const next = { ...(s ?? {}), autoDeploy }
    setS(next)
    try {
      // Stüdyo ayarlarıyla aynı kayıtta: önce güncelini oku ki diğer alanlar ezilmesin
      const cur = (await loadSetting<StudioSettings>('studio')) ?? {}
      await saveSetting('studio', { ...cur, autoDeploy })
      toast(autoDeploy ? 'Yayından sonra site otomatik derlenecek' : 'Otomatik derleme kapatıldı')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <Card title="Yayın" desc="Değişiklikler sitede anında görünür. Arama motorları için hazırlanan sayfaların da güncellenmesi için site yeniden derlenir.">
      <div className="space-y-5">
        <Toggle checked={!!s?.autoDeploy} onChange={setAuto} label="Stüdyo’dan yayınladıktan sonra siteyi otomatik derle" help="Vercel deploy hook gerekir (VERCEL_DEPLOY_HOOK)." />
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<CloudUpload size={16} />} loading={busy} onClick={deploy}>
            Siteyi şimdi yeniden derle
          </Button>
          <span className="text-xs font-semibold text-ink-soft">Çok sayıda değişiklikten sonra bir kez çalıştırmanız yeterli.</span>
        </div>
      </div>
    </Card>
  )
}

function AdminsCard({ email }: { email: string }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [rows, setRows] = useState<AdminRow[] | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPw, setNewPw] = useState('')
  const [role, setRole] = useState<'editor' | 'owner'>('editor')
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    sb.from('cms_admins').select('*').order('created_at').then(({ data }) => setRows((data ?? []) as AdminRow[]))
    sb.rpc('is_cms_owner').then(({ data }) => setIsOwner(!!data))
  }, [tick])

  const add = async () => {
    setBusy(true)
    try {
      const r = await studioCall<{ ok: boolean; existed?: boolean }>({ action: 'create_admin', email: newEmail, password: newPw, role })
      toast(r.existed ? `${newEmail} zaten kayıtlıydı; yönetici yapıldı (şifresi değiştirilmedi)` : `${newEmail} için hesap oluşturuldu. Bu e-posta ve şifreyle /yonetim adresinden giriş yapabilir.`)
      setNewEmail('')
      setNewPw('')
      setTick((x) => x + 1)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  const remove = async (r: AdminRow) => {
    if (!(await confirm({ title: 'Yöneticilik kaldırılsın mı?', desc: `${r.email} artık panele giremez.`, confirm: 'Kaldır', danger: true }))) return
    const { error } = await sb.rpc('remove_cms_admin', { p_user: r.user_id })
    if (error) return toast(error.message, 'error')
    setTick((x) => x + 1)
  }

  return (
    <Card title="Yöneticiler" desc="Panele girip içerik düzenleyebilen kişiler">
      {!rows ? (
        <div className="h-24 animate-pulse rounded-xl bg-paper" />
      ) : (
        <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
          {rows.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-sm font-black text-brand-ink uppercase">{r.email.slice(0, 1)}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">
                {r.email} {r.email === email && <span className="text-ink-soft">(siz)</span>}
              </span>
              <Badge tone={r.role === 'owner' ? 'pink' : 'gray'}>{r.role === 'owner' ? 'Sahip' : 'Editör'}</Badge>
              {isOwner && r.email !== email && (
                <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => remove(r)}>
                  Kaldır
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {isOwner ? (
        <div className="mt-5 rounded-2xl bg-paper p-4 ring-1 ring-line">
          <p className="mb-3 flex items-center gap-2 text-sm font-black">
            <UserPlus size={16} />
            Yönetici ekle
          </p>
          <div className="flex flex-wrap gap-2">
            <TextInput value={newEmail} onChange={setNewEmail} placeholder="ogretmen@eposta.com" type="email" autoComplete="off" className="min-w-56 flex-1" />
            <TextInput value={newPw} onChange={setNewPw} placeholder="Şifre (en az 6 karakter)" type="text" autoComplete="new-password" className="min-w-48 flex-1" />
            <Select
              value={role}
              onChange={setRole}
              options={[
                { value: 'editor', label: 'Editör' },
                { value: 'owner', label: 'Sahip' },
              ]}
              className="w-36"
            />
            <Button variant="primary" icon={<Plus size={16} />} loading={busy} disabled={!/\S+@\S+\.\S+/.test(newEmail) || newPw.length < 6} onClick={add}>
              Hesap oluştur
            </Button>
          </div>
          <p className="mt-2 text-xs font-semibold text-ink-soft">Kişi bu e-posta ve şifreyle /yonetim adresinden giriş yapar; şifresini sonra Ayarlar’dan değiştirebilir. Editörler içerik düzenler; sahipler ayrıca yönetici ekleyip çıkarabilir.</p>
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-ink-soft">Yönetici eklemek için “Sahip” yetkisi gerekir.</p>
      )}
    </Card>
  )
}

function PasswordCard() {
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (pw.length < 6) return toast('Şifre en az 6 karakter olmalı', 'error')
    if (pw !== pw2) return toast('Şifreler aynı değil', 'error')
    setBusy(true)
    const { error } = await sb.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return toast(error.message, 'error')
    setPw('')
    setPw2('')
    toast('Şifreniz değiştirildi')
  }
  return (
    <Card title="Şifremi değiştir">
      <div className="flex flex-wrap gap-2">
        <TextInput type="password" autoComplete="new-password" value={pw} onChange={setPw} placeholder="Yeni şifre" className="min-w-48 flex-1" />
        <TextInput type="password" autoComplete="new-password" value={pw2} onChange={setPw2} placeholder="Yeni şifre (tekrar)" className="min-w-48 flex-1" />
        <Button variant="primary" loading={busy} disabled={!pw || !pw2} onClick={save}>
          Kaydet
        </Button>
      </div>
    </Card>
  )
}
