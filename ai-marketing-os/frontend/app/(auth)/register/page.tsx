"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { Eye, EyeOff, Mail, Lock, User, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/hooks/use-auth"

const registerSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  workspace_name: z.string().min(2, "Workspace name must be at least 2 characters"),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms" }),
  }),
})

type RegisterForm = z.infer<typeof registerSchema>

function getPasswordStrength(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 10
  if (/[A-Z]/.test(password)) score += 25
  if (/[0-9]/.test(password)) score += 25
  if (/[^A-Za-z0-9]/.test(password)) score += 15
  return Math.min(100, score)
}

function getPasswordStrengthLabel(strength: number): { label: string; color: string } {
  if (strength < 30) return { label: "Weak", color: "bg-red-500" }
  if (strength < 60) return { label: "Fair", color: "bg-yellow-500" }
  if (strength < 80) return { label: "Good", color: "bg-blue-500" }
  return { label: "Strong", color: "bg-green-500" }
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { register: registerUser, isLoading } = useAuth()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch("password", "")
  const passwordStrength = getPasswordStrength(password)
  const { label: strengthLabel, color: strengthColor } = getPasswordStrengthLabel(passwordStrength)

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        workspace_name: data.workspace_name,
      })
    } catch {
      setError("root", {
        message: "Registration failed. Please try again.",
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground">
          Start your AI marketing journey today
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 border border-destructive/20"
          >
            {errors.root.message}
          </motion.div>
        )}

        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="full_name"
              placeholder="John Smith"
              className="pl-10"
              error={!!errors.full_name}
              {...register("full_name")}
            />
          </div>
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-10"
              error={!!errors.email}
              autoComplete="email"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              className="pl-10 pr-10"
              error={!!errors.password}
              autoComplete="new-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {password && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-1 mr-2">
                  {[0, 25, 50, 75].map((threshold) => (
                    <div
                      key={threshold}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        passwordStrength > threshold ? strengthColor : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{strengthLabel}</span>
              </div>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspace_name">Workspace name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="workspace_name"
              placeholder="Acme Marketing"
              className="pl-10"
              error={!!errors.workspace_name}
              {...register("workspace_name")}
            />
          </div>
          {errors.workspace_name && (
            <p className="text-xs text-destructive">{errors.workspace_name.message}</p>
          )}
        </div>

        <div className="flex items-start gap-2 pt-2">
          <input
            id="terms"
            type="checkbox"
            className="h-4 w-4 mt-0.5 rounded border-input accent-primary cursor-pointer"
            {...register("terms")}
          />
          <Label htmlFor="terms" className="font-normal cursor-pointer leading-relaxed">
            I agree to the{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </Label>
        </div>
        {errors.terms && (
          <p className="text-xs text-destructive">{errors.terms.message}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          variant="gradient"
          loading={isLoading}
        >
          {isLoading ? "Creating account..." : "Create free account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
