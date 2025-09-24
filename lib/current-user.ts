import { useSession } from 'next-auth/react'
import { auth } from '@/auth'

export const useCurrentUser = () => {
  const { data: session } = useSession()

  return session?.user
}

export const getCurrentUser = async () => {
  const session = await auth()
  return session?.user
}