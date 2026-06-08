'use client'
import dynamic from 'next/dynamic'

const WkbApp = dynamic(() => import('../../components/WkbApp'), { ssr: false })

export default function AppPage() {
  return <WkbApp />
}
