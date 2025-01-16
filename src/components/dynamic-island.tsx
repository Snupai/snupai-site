'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Menu, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

const navigationItems = [
  { 
    name: 'Home', 
    path: '/',
    description: 'Return to the homepage'
  },
  { 
    name: 'About', 
    path: '/about',
    description: 'Learn more about me'
  },

  { 
    name: 'Projects', 
    path: '/projects',
    description: 'Explore my bad code'
  },
  { 
    name: 'Contact', 
    path: '/contact',
    description: 'Get in touch with me'
  }
]

export default function DynamicIsland() {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const router = useRouter()
  const pathname = usePathname()

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
    if (isExpanded) {
      setSearchQuery('')
    }
  }

  const navigateHome = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push('/')
  }

  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return navigationItems
    
    const lowerQuery = searchQuery.toLowerCase()
    return navigationItems.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery)
    )
  }, [searchQuery])

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

  // Calculate dynamic height based on content
  const getExpandedHeight = () => {
    const baseHeight = 140 // Height with just search bar
    const itemHeight = 80 // Approximate height of each item
    const rows = Math.ceil(filteredItems.length / 2) // Items per row (2 columns)
    const contentHeight = filteredItems.length ? baseHeight + (rows * itemHeight) : baseHeight
    return Math.min(contentHeight, 380) // Cap at max height
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
          className="h-11 px-6 flex items-center justify-between cursor-pointer w-full overflow-hidden"
          onClick={toggleExpand}
        >
          <div className="flex items-center gap-3 min-w-0">
            {isExpanded ? (
              <X className="h-4 w-4 flex-shrink-0" />
            ) : (
              <Menu className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="text-sm font-medium truncate">Dynamic Menu</span>
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
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 pb-6 pt-2 w-full"
            >
              {/* Search Bar */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative mb-4"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search navigation..."
                  className="w-full h-10 pl-10 pr-4 bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  aria-label="Search navigation"
                />
              </motion.div>

              {/* Navigation Items */}
              <AnimatePresence mode="wait">
                {filteredItems.length > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-2"
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
                          <div className="text-xs text-gray-400 mt-1">{item.description}</div>
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
                    className="text-center text-gray-400 py-4"
                  >
                    No results found for &quot;{searchQuery}&quot;
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

