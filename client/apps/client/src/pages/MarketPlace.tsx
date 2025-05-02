import { Header } from '../components/layout/Header'
import { ListedNFT } from '../components/marketplace/ListedNFT'
import { MyNFT } from '../components/marketplace/MyNFT'

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <ListedNFT />
        <MyNFT />
      </main>
    </div>
  )
}
