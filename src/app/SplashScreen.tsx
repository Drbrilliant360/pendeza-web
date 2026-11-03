// Web version of screens/splash_view.dart: brand gradient, logo, loader.
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-hero-light text-white dark:bg-hero-dark">
      <img src="/images/icons/App_Icon.png" alt="Pendeza" className="h-24 w-24 rounded-[28px] shadow-lg1" />
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Pendeza</h1>
      <p className="mt-1 text-sm text-white/80">Beauty, booked.</p>
      <div className="mt-10 h-1 w-28 overflow-hidden rounded-full bg-white/25">
        <div className="h-full w-1/2 animate-[splash_1.1s_ease-in-out_infinite] rounded-full bg-white" />
      </div>
      <style>{`@keyframes splash{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}`}</style>
    </div>
  )
}
