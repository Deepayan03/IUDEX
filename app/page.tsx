import AuthButtons from "@/components/auth/authButtons"

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">IUDEX</h1>
      <p className="text-neutral-400">
        CRDT-powered collaborative code editor
      </p>
      <AuthButtons />
    </div>
  )
}