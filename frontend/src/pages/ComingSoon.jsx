import { useSearchParams, Link } from 'react-router-dom';

const jokes = {
    recruiter: [
        "Why did the recruiter bring a ladder to the interview? They heard the job had great upward mobility! 🪜",
        "How many recruiters does it take to change a lightbulb? None, they just keep sourcing until they find one that's already lit! 💡",
        "A recruiter walks into a bar... and asks the bartender if they know anyone with 10 years of experience in a 5-year-old technology. 🍺",
        "Why do recruiters make great detectives? They're experts at finding needles in haystacks! 🔍",
    ],
    candidate: [
        "Why did the candidate bring a mirror to the interview? For self-reflection! 🪞",
        "How do you know you've been job hunting too long? You start getting rejection emails from places you don't remember applying to! 📧",
        "What's a candidate's favorite exercise? The job hunt! 🏃‍♂️",
        "Why did the candidate study their resume before the interview? Because they forgot what skills they lied about! 📝",
    ],
};

export default function ComingSoon() {
    const [searchParams] = useSearchParams();
    const role = searchParams.get('role') || 'recruiter';
    const roleJokes = jokes[role] || jokes.recruiter;
    const randomJoke = roleJokes[Math.floor(Math.random() * roleJokes.length)];

    const roleTitle = role === 'recruiter' ? 'Recruiter' : 'Candidate';
    const roleColor = role === 'recruiter' ? 'accent-teal' : 'accent-orange';

    return (
        <div className="min-h-screen bg-base text-white relative overflow-hidden flex items-center justify-center px-6">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-${roleColor}/10 rounded-full blur-[150px]`} />
            </div>

            <div className="relative z-10 max-w-xl text-center animate-slide-up">
                {/* Construction emoji */}
                <div className="text-7xl mb-8">🚧</div>

                {/* Title */}
                <h1 className="text-4xl font-semibold mb-4">
                    {roleTitle} Portal
                </h1>
                <p className="text-xl text-slate-400 mb-8">
                    We're crafting something amazing for you!
                </p>

                {/* Joke card */}
                <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left">
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                        <span>💭</span>
                        While you wait, here's a joke:
                    </div>
                    <p className="text-lg leading-relaxed">{randomJoke}</p>
                </div>

                {/* Back button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl text-white hover:bg-elevated hover:border-border-light transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to home
                </Link>

                {/* Footer note */}
                <p className="mt-12 text-slate-500 text-sm">
                    Check back soon for updates ✨
                </p>
            </div>

            <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
      `}</style>
        </div>
    );
}
