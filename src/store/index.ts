import { create } from 'zustand'

interface User {
  id: number
  username: string
  name: string
  allergens?: string[]
  role?: string
}

interface AppState {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))

export default useAppStore
