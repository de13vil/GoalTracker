import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { registerUser } from "../api/auth";

const roles = ["Employee", "Manager", "Admin"];


export default function Register({ onLogin }) {
  const isDemo = (import.meta && import.meta.env && import.meta.env.DEV) || new URLSearchParams(window.location.search).has('demo');
  const [formData, setFormData] = useState({ fullName: "", email: "", username: "", role: "Employee", password: "", confirmPassword: "", registrationKey: "", otp: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpStep) {
      // Initial registration step
      if (!formData.fullName || !formData.email || !formData.username || !formData.role || !formData.password || !formData.confirmPassword) {
        setError("All fields are required");
        return;
      }
      if ((formData.role === "Manager" || formData.role === "Admin") && !formData.registrationKey) {
        setError("Registration key is required for Manager/Admin");
        return;
      }
      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters long");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setError("");
      setLoading(true);
      try {
        await registerUser({
          fullName: formData.fullName,
          email: formData.email,
          username: formData.username,
          role: formData.role,
          password: formData.password,
          registrationKey: formData.registrationKey,
        });
        setLoading(false);
        setOtpStep(true);
        setPendingData({ ...formData });
      } catch (err) {
        setLoading(false);
        setError(err.message);
      }
    } else {
      // OTP verification step
      if (!formData.otp) {
        setError("Please enter the OTP sent to your email");
        return;
      }
      setError("");
      setLoading(true);
      try {
        await registerUser({
          ...pendingData,
          otp: formData.otp,
        });
        setLoading(false);
        onLogin?.(null);
        navigate("/login", { state: { registered: true } });
      } catch (err) {
        setLoading(false);
        setError(err.message);
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundImage: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 52%, #e0e7ff 100%)" }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -bottom-40 right-40"></div>
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundImage: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)" }}
            >
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Create Account</h1>
          <p className="text-center text-gray-600 mb-8">Join GoalTracker today</p>
          {isDemo && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm text-center">
              Demo mode: seeded demo accounts are available for evaluation (see DEMO.md). Use ?demo=true in the URL to show this message on other hosts.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!otpStep && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Choose a username"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                {(formData.role === "Manager" || formData.role === "Admin") && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Registration Key</label>
                    <input
                      type="text"
                      name="registrationKey"
                      value={formData.registrationKey}
                      onChange={handleChange}
                      placeholder="Enter registration key"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a password"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}
            {otpStep && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">OTP</label>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  placeholder="Enter OTP sent to your email"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-white font-bold rounded-lg hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundImage: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)" }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
