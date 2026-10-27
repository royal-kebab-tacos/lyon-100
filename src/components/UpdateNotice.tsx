import { useRegisterSW } from 'virtual:pwa-register/react'
export function UpdateNotice({ busy }: { busy: boolean }) {
  const { offlineReady: [ready], needRefresh: [refresh], updateServiceWorker } = useRegisterSW()
  if (refresh) return <div className="update-notice">Une mise à jour est prête. <button disabled={busy} onClick={() => void updateServiceWorker(true)}>Mettre à jour</button>{busy && ' Attendez la fin du traitement.'}</div>
  if (ready) return <span className="offline-ready">Application prête hors ligne</span>
  return null
}
