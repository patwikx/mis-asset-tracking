"use client"

import * as z from "zod"
import { useForm, Controller } from "react-hook-form"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Eye, EyeOff, Monitor } from "lucide-react"

// Keep your original imports and schema
import { LoginSchema } from "@/lib/validations/login-schema"
import { login } from "@/lib/auth-actions/login"

// Custom styled alert components for errors and success
const FormError = ({ message }: { message?: string }) => {
  if (!message) return null
  return (
    <div className="bg-red-950/30 border border-red-900/50 text-red-300 px-4 py-3 rounded-lg mb-4 backdrop-blur-sm">
      {message}
    </div>
  )
}

const FormSuccess = ({ message }: { message?: string }) => {
  if (!message) return null
  return (
    <div className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 px-4 py-3 rounded-lg mb-4 backdrop-blur-sm">
      {message}
    </div>
  )
}

export const LoginForm = () => {
  const searchParams = useSearchParams()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const callbackUrl = searchParams?.get("callbackUrl")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      employeeId: "",
      passwordHash: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof LoginSchema>) => {
    setError("")
    setSuccess("")
    setIsLoading(true)
    try {
      const data = await login(values)
      if (data?.error) {
        setError(data.error)
      } else if (data.success) {
        // On successful login, redirect to the dashboard or home page
        window.location.assign("/setup")
      }
    } catch (error) {
      setError(`An unexpected error occurred. Please try again. ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="min-h-screen bg-black flex relative overflow-hidden">
      {/* Pitch black background with subtle gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.02),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.01),transparent_50%)]"></div>
      
      {/* Left Panel - Centered Abstract Design */}
      <div className="hidden lg:flex lg:w-7/12 bg-transparent p-8 xl:p-16 flex-col justify-center items-center relative z-10">
        <div className="relative w-full max-w-lg flex flex-col items-center">
          {/* Modern geometric abstract design */}
          <div className="relative w-96 h-96 flex items-center justify-center mb-12">
            {/* Floating geometric shapes */}
            <div className="absolute top-20 left-16 w-16 h-16 border border-white/20 rounded-lg rotate-12 animate-pulse bg-white/5 backdrop-blur-sm"></div>
            <div className="absolute top-32 right-20 w-12 h-12 border border-white/15 rounded-full animate-pulse bg-white/3" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-24 left-24 w-14 h-14 border border-white/25 rotate-45 animate-pulse bg-white/5" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-20 right-16 w-10 h-10 border border-white/20 rounded-lg -rotate-12 animate-pulse bg-white/4" style={{ animationDelay: '3s' }}></div>
            
            {/* Diagonal lines */}
            <div className="absolute w-80 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute w-80 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            
            {/* Central hexagon with monitor */}
            <div className="relative">
              <div className="w-32 h-32 border border-white/30 bg-white/5 backdrop-blur-sm flex items-center justify-center" 
                   style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <Monitor className="w-12 h-12 text-white" />
              </div>
            </div>
            
            {/* Orbiting elements */}
            <div className="absolute w-6 h-6 border border-white/40 rounded-sm bg-white/10 animate-spin" 
                 style={{ 
                   top: '20%', 
                   left: '20%', 
                   animationDuration: '8s',
                   transformOrigin: '120px 120px'
                 }}>
            </div>
            <div className="absolute w-4 h-4 border border-white/30 rounded-full bg-white/8 animate-spin" 
                 style={{ 
                   top: '70%', 
                   right: '25%', 
                   animationDuration: '12s',
                   animationDirection: 'reverse',
                   transformOrigin: '-80px -80px'
                 }}>
            </div>
            
            {/* Network connection lines */}
            <div className="absolute top-1/4 left-1/4 w-32 h-px bg-gradient-to-r from-white/20 to-transparent rotate-12"></div>
            <div className="absolute bottom-1/3 right-1/4 w-28 h-px bg-gradient-to-l from-white/15 to-transparent -rotate-12"></div>
            <div className="absolute top-1/3 right-1/3 w-24 h-px bg-gradient-to-r from-transparent to-white/20 rotate-45"></div>
          </div>
          
          {/* Centered branding */}
          <div className="text-center">
            <h1 className="text-white text-4xl font-bold mb-3">MIS Asset Tracking System</h1>
            <p className="text-gray-400 text-base">Comprehensive IT Asset Management Solution</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-5/12 bg-black/95 backdrop-blur-sm flex items-center justify-center p-6 lg:p-8 relative z-10 border-l border-gray-900/50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Monitor className="text-white w-8 h-8" />
            <div className="text-center">
              <h1 className="text-gray-50 text-xl font-bold">MIS Asset Tracking</h1>
              <p className="text-gray-500 text-xs">Asset Management System</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-gray-50 text-3xl font-semibold mb-2">
              {showTwoFactor ? "Two-Factor Authentication" : "Welcome Back"}
            </h2>
            {!showTwoFactor && (
              <p className="text-gray-400">Access your asset management dashboard</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {showTwoFactor ? (
              // --- 2FA Code Field ---
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Verification Code
                </label>
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="123456"
                      disabled={isLoading}
                      className="w-full h-14 bg-black border border-gray-800 rounded-lg px-4 text-gray-100 text-xl tracking-wider text-center focus:border-white focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-white/20"
                    />
                  )}
                />
                {errors.code && (
                  <p className="text-red-400 text-sm mt-1">{errors.code.message}</p>
                )}
              </div>
            ) : (
              <>
                {/* --- Username Field --- */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Employee ID
                  </label>
                  <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Enter your employee ID"
                        disabled={isLoading}
                        className="w-full h-14 bg-black border border-gray-800 rounded-lg px-4 text-gray-100 focus:border-white focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-white/20"
                      />
                    )}
                  />
                  {errors.employeeId && (
                    <p className="text-red-400 text-sm mt-1">{errors.employeeId.message}</p>
                  )}
                </div>

                {/* --- Password Field --- */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-gray-300 text-sm font-medium">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Controller
                      name="passwordHash"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          disabled={isLoading}
                          className="w-full h-14 bg-black border border-gray-800 rounded-lg px-4 pr-12 text-gray-100 focus:border-white focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-white/20"
                        />
                      )}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.passwordHash && (
                    <p className="text-red-400 text-sm mt-1">{errors.passwordHash.message}</p>
                  )}
                </div>

                {/* --- Remember Me --- */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="w-4 h-4 text-white bg-black border-gray-700 rounded focus:ring-white focus:ring-2"
                    />
                    <label htmlFor="remember" className="ml-2 text-gray-400 text-sm">
                      Remember me
                    </label>
                  </div>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-white hover:text-gray-300 text-sm font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </>
            )}

            {/* Error and Success Messages */}
            <FormError message={error} />
            <FormSuccess message={success} />

            {/* --- Submit Button --- */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-white hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-500 text-black font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-white/20"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  <span>{showTwoFactor ? "Verifying..." : "Signing in..."}</span>
                </>
              ) : (
                <span>{showTwoFactor ? "Verify & Access System" : "Login"}</span>
              )}
            </button>

            {/* Footer Links */}
            {!showTwoFactor && (
              <div className="text-center pt-4 border-t border-gray-900/50">
                <p className="text-gray-500 text-sm">
                  Need access to the system?{' '}
                  <Link 
                    href="/auth/register" 
                    className="text-white hover:text-gray-300 font-medium transition-colors"
                  >
                    Request Account
                  </Link>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}