'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Menu, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

interface PageContent {
  path: string
  name: string
  description: string
  content: string
  matches: number
}

export default function DynamicIsland() {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isMenuClosing, setIsMenuClosing] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const [pageContent, setPageContent] = React.useState<PageContent[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch('/api/search')
        const data = await response.json() as { pages: PageContent[] }
        setPageContent(data.pages)
      } catch (error) {
        console.error('Failed to fetch pages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchPages()
  }, [])

  const toggleExpand = () => {
    if (isMenuClosing) return
    
    setIsExpanded(!isExpanded)
    if (isExpanded) {
      setIsMenuClosing(true)
      setSearchQuery('')
    } else {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }

  const navigateHome = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push('/')
    if (isExpanded) {
      setIsExpanded(false)
      setSearchQuery('')
    }
  }

  const filteredItems = React.useMemo(() => {
    if (isLoading) return []
    if (!searchQuery) return pageContent
    
    const lowerQuery = searchQuery.toLowerCase()
    return pageContent.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.content.toLowerCase().includes(lowerQuery)
    )
  }, [searchQuery, pageContent, isLoading])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredItems.length > 0 && filteredItems[0]?.path) {
      router.push(filteredItems[0].path)
      setIsExpanded(false)
      setSearchQuery('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isExpanded) {
      setIsExpanded(false)
      setSearchQuery('')
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isExpanded, handleKeyDown])

  // Calculate dynamic height based on content and screen size
  const getExpandedHeight = () => {
    // Check if we're on a larger screen using a media query
    const isLargeScreen = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
    return isLargeScreen ? 320 : 380 // Less height on larger screens
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        className="bg-black text-white overflow-hidden"
        animate={{
          width: isExpanded ? '90vw' : 200,
          height: isExpanded ? getExpandedHeight() : 44,
          borderRadius: 24,
          maxWidth: isExpanded ? 600 : 200,
          transition: {
            type: "spring",
            damping: 20,
            stiffness: 300
          }
        }}
        style={{
          transformOrigin: "center top"
        }}
      >
        {/* Main Bar */}
        <motion.div
          className={`h-11 px-6 flex items-center justify-between w-full overflow-hidden ${
            isMenuClosing ? 'pointer-events-none' : 'cursor-pointer'
          }`}
          onClick={toggleExpand}
        >
          <div className="flex items-center gap-3 min-w-0">
            {isExpanded ? (
              <X className="h-4 w-4 flex-shrink-0" />
            ) : (
              <Menu className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="text-sm font-medium truncate">Site Navigation</span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <Home 
              className={`h-4 w-4 cursor-pointer transition-colors ${
                pathname === '/' ? 'text-primary' : 'hover:text-gray-300'
              }`}
              onClick={navigateHome}
            />
          </div>
        </motion.div>

        {/* Expanded Content */}
        <AnimatePresence
          onExitComplete={() => {
            setIsMenuClosing(false)
          }}
        >
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 pb-6 pt-2 w-full h-full flex flex-col"
            >
              {/* Search Bar */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative mb-4 flex-shrink-0"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search navigation..."
                  className="w-full h-10 pl-10 pr-4 bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  aria-label="Search navigation"
                />
              </motion.div>

              {/* Navigation Items - Add overflow container */}
              <div className="overflow-y-auto flex-grow">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      className="text-center text-gray-400 py-6 md:py-2"
                    >
                      Loading...
                    </motion.div>
                  ) : filteredItems.length > 0 ? (
                    <motion.div
                      key="results"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ delay: 0.1 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-2 min-h-0 pb-6 md:pb-2"
                    >
                      {filteredItems.map((item) => (
                        <Link 
                          key={item.name} 
                          href={item.path}
                          className="block"
                        >
                          <motion.button
                            className={`w-full p-3 text-left rounded-lg text-sm transition-colors ${
                              pathname === item.path
                                ? 'bg-primary/20 text-primary'
                                : 'hover:bg-white/5'
                            }`}
                            onClick={() => {
                              setIsExpanded(false)
                              setSearchQuery('')
                            }}
                            whileHover={{ x: 5 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {item.description}
                              {searchQuery && item.matches > 0 && (
                                <span className="ml-1 text-primary">
                                  ({item.matches} {item.matches === 1 ? 'match' : 'matches'})
                                </span>
                              )}
                            </div>
                          </motion.button>
                        </Link>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="no-results"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      className="text-center text-gray-400 py-6 md:py-2 px-2"
                    >
                      <span className="break-words">
                        No results found for &quot;{searchQuery}&quot;
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

