import { Link } from 'react-router-dom';
import { CloudLightning, ShieldCheck, Infinity as InfinityIcon, Zap } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30 selection:text-foreground">
      {/* Header */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
            U
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 tracking-tight">
            Unistro
          </span>
        </div>
        <Link 
          to="/login"
          className="px-6 py-2.5 rounded-full font-medium text-sm transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow active:scale-95"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-32 pb-20 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background to-background pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 backdrop-blur-md border border-primary/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            Powered by Telegram infrastructure
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground sm:text-7xl mb-6">
            Unlimited cloud storage. <br className="hidden sm:block"/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              Completely free, forever.
            </span>
          </h1>

          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Store anything: photos, videos, documents, music, archives. No limits, no subscriptions, no storage anxiety. Your private digital vault.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/login"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-full overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 w-full sm:w-auto"
            >
              <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" />
              <span className="relative flex items-center gap-2">
                Get Started
                <CloudLightning className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={20} />
              </span>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-32 relative z-10 text-left">
          <div className="bg-card/50 backdrop-blur-sm border border-border p-8 rounded-3xl hover:border-primary/50 transition-colors shadow-sm group">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
              <InfinityIcon className="text-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-foreground">Truly Unlimited</h3>
            <p className="text-muted-foreground leading-relaxed">Never worry about quotas again. Upload thousands of photos, massive video files, or 10 years of archives. You will never pay a dime.</p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border p-8 rounded-3xl hover:border-primary/50 transition-colors shadow-sm group">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
              <ShieldCheck className="text-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-foreground">Private & Secure</h3>
            <p className="text-muted-foreground leading-relaxed">Your files live in a dedicated, hidden Telegram channel only you can access. No one else — not even us — can see your precious memories.</p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border p-8 rounded-3xl hover:border-primary/50 transition-colors shadow-sm group">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
              <Zap className="text-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-foreground">Lightning Fast</h3>
            <p className="text-muted-foreground leading-relaxed">Log in instantly with just your phone number. Upload files up to 2GB each at blazing speeds. Stream videos beautifully without downloading.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border mt-auto backdrop-blur-md bg-background/80">
        <p>© {new Date().getFullYear()} Unistro. Unlimited storage, zero limits.</p>
      </footer>
    </div>
  );
}
