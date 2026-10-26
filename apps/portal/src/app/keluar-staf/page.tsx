import { SignOut } from './signout'
export const metadata = { title: 'Keluar' }
export default function KeluarStaf() {
  return (
    <main id="main" className="narrow" style={{ padding: '64px 16px' }}>
      <SignOut />
    </main>
  )
}
