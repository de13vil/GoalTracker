import { Link } from "react-router-dom";
import { ArrowRight, Target, CheckCircle, Users, Shield, TrendingUp, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      className="w-full min-h-screen"
      style={{ backgroundImage: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 52%, #e0e7ff 100%)" }}
    >
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Target className="w-8 h-8 text-blue-600" />
            <span
              className="text-2xl font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)" }}
            >
              GoalTracker
            </span>
          </div>
          <div className="flex gap-3">
            <Link
              to="/login"
              className="px-6 py-2.5 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 text-white font-semibold rounded-lg hover:shadow-lg transition-all hover:scale-105"
              style={{ backgroundImage: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)" }}
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -top-40 -left-40"></div>
          <div className="absolute w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -bottom-40 right-40"></div>
        </div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-8">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #2563eb 0%, #4f46e5 55%, #9333ea 100%)" }}
            >
              Set. Track. Achieve.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            A modern, intuitive platform for structured goal setting, real-time tracking, and performance visibility. Empower your organization to align, achieve, and grow together.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/login"
              className="px-8 py-4 text-white font-bold rounded-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center gap-2 text-lg"
              style={{ backgroundImage: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)" }}
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/register"
              className="px-8 py-4 border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all text-lg"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-white/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-4 text-gray-900">Why GoalTracker?</h2>
          <p className="text-center text-gray-600 text-xl mb-16 max-w-2xl mx-auto">
            Built for organizations seeking structured, transparent, and scalable goal management.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Target, title: "Goal Creation & Approval", desc: "Employees submit goals, managers review and approve with validation and weightage rules." },
              { icon: CheckCircle, title: "Achievement Tracking", desc: "Log actual achievement vs. planned targets. Quarterly check-ins with structured feedback." },
              { icon: TrendingUp, title: "Real-Time Analytics", desc: "System-computed progress scores, dashboards, and completion insights at a glance." },
              { icon: Users, title: "Role-Based Access", desc: "Tailored dashboards for Employee, Manager, and Admin/HR with clear permissions." },
              { icon: Shield, title: "Secure & Auditable", desc: "Secure authentication, audit trails, and exportable reports for compliance." },
              { icon: Zap, title: "Lightning Fast", desc: "Modern, responsive UI built for speed and reliability. Works seamlessly across devices." },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 group border border-gray-100"
              >
                <feature.icon className="w-12 h-12 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16 text-gray-900">User Roles & Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Employee",
                color: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                points: ["Draft and submit goals", "Log quarterly achievements", "View locked goals", "Update progress status"],
              },
              {
                title: "Manager (L1)",
                color: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                points: ["Review and approve goals", "Conduct quarterly check-ins", "Team dashboard", "Log feedback and comments"],
              },
              {
                title: "Admin / HR",
                color: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                points: ["Configure cycles", "Manage org hierarchy", "Oversee completion rates", "Exception handling"],
              },
            ].map((role, idx) => (
              <div
                key={idx}
                className="p-8 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                style={{ backgroundImage: role.color }}
              >
                <h3 className="text-2xl font-bold mb-6">{role.title}</h3>
                <ul className="space-y-3">
                  {role.points.map((point, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-white/50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16 text-gray-900">How It Works</h2>
          <div className="space-y-8">
            {[
              { step: "01", title: "Register or Login", desc: "Create your account or sign in as Employee, Manager, or Admin/HR." },
              { step: "02", title: "Set & Approve Goals", desc: "Employees submit goals, managers review and approve, admins oversee cycles." },
              { step: "03", title: "Track & Succeed", desc: "Log achievements, track progress, and celebrate success with analytics." },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-6 md:gap-12 items-start group">
                <div
                  className="w-20 h-20 text-white rounded-full flex items-center justify-center text-3xl font-bold shrink-0"
                  style={{ backgroundImage: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)" }}
                >
                  {item.step}
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                  <p className="text-gray-600 text-lg">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div
          className="max-w-4xl mx-auto rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl"
          style={{ backgroundImage: "linear-gradient(90deg, #2563eb 0%, #4f46e5 52%, #9333ea 100%)" }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your Goal Management?</h2>
          <p className="text-lg md:text-xl mb-10 opacity-90">Join organizations that are achieving more with structured goal tracking.</p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-white text-blue-600 font-bold rounded-xl hover:shadow-2xl transition-all hover:scale-105 text-lg"
          >
            Start Your Journey Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">
            &copy; {new Date().getFullYear()} GoalTracker Portal. AtomQuest Hackathon Submission.
          </p>
        </div>
      </footer>
    </div>
  );
}
