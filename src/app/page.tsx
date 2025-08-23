"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { 
  GitBranch, 
  Sparkles, 
  Zap, 
  Shield, 
  Code2, 
  FileText,
  ArrowRight,
  CheckCircle,
  Github,
  Terminal,
  Cpu,
  Globe
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const features = [
  {
    icon: <GitBranch className="h-6 w-6" />,
    title: "GitHub Integration",
    description: "Seamlessly connect and analyze your GitHub repositories with one-click authentication.",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "AI-Powered Documentation",
    description: "Generate comprehensive, intelligent documentation that understands your code context.",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Lightning Fast",
    description: "Cloud-native architecture ensures blazing fast documentation generation at scale.",
    gradient: "from-orange-500 to-red-500"
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Enterprise Security",
    description: "Bank-grade encryption and security practices to protect your code and data.",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: <Code2 className="h-6 w-6" />,
    title: "Multi-Language Support",
    description: "Works with all major programming languages and frameworks out of the box.",
    gradient: "from-indigo-500 to-purple-500"
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Smart Formatting",
    description: "Beautiful, readable documentation with automatic formatting and structure.",
    gradient: "from-pink-500 to-rose-500"
  }
];

const stats = [
  { value: "10K+", label: "Repositories Analyzed" },
  { value: "50M+", label: "Lines Documented" },
  { value: "99.9%", label: "Uptime" },
  { value: "< 30s", label: "Average Generation" }
];

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedBackground />
      
      {/* Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`
          }}
        />
        <div 
          className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-blue-500/30 to-cyan-500/30 blur-3xl"
          style={{
            transform: `translate(${-mousePosition.x * 0.02}px, ${-mousePosition.y * 0.02}px)`
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 blur-md" />
              <Terminal className="relative h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Fondation
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
            <ThemeSwitcher />
            <Link href="/login">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center space-x-2 rounded-full border border-border/50 bg-muted/50 px-4 py-2 mb-8 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Powered by Advanced AI</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
              Documentation
            </span>
            <br />
            <span className="text-foreground">That Writes Itself</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Transform your codebase into comprehensive, intelligent documentation with the power of AI. 
            Ship faster, onboard easier, maintain better.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8">
                Start Generating
                <Zap className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 glass">
              <Github className="mr-2 h-5 w-5" />
              View on GitHub
            </Button>
          </div>
        </motion.div>

        {/* Live Demo Terminal */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <div className="glass rounded-2xl p-1 backdrop-blur-xl">
            <div className="bg-background/80 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-4 text-sm text-muted-foreground">fondation-cli</span>
              </div>
              <div className="font-mono text-sm space-y-2">
                <div className="text-green-500">$ fondation analyze ./my-project</div>
                <div className="text-muted-foreground">
                  <span className="inline-block animate-pulse">▸</span> Scanning repository structure...
                </div>
                <div className="text-muted-foreground">
                  <CheckCircle className="inline h-4 w-4 text-green-500 mr-2" />
                  Found 142 files across 23 directories
                </div>
                <div className="text-muted-foreground">
                  <span className="inline-block animate-pulse">▸</span> Analyzing code patterns with AI...
                </div>
                <div className="text-muted-foreground">
                  <CheckCircle className="inline h-4 w-4 text-green-500 mr-2" />
                  Generated comprehensive documentation
                </div>
                <div className="text-green-500">✨ Documentation ready at ./docs</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create world-class documentation, automatically.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="glass glass-hover rounded-2xl p-6 h-full transition-all duration-300 hover:scale-[1.02]">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="glass rounded-3xl p-12 backdrop-blur-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <Cpu className="h-16 w-16 mx-auto mb-6 text-purple-500" />
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your
            <span className="block bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Documentation Workflow?
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of developers who are shipping faster with AI-powered documentation.
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-12 py-6">
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Terminal className="h-6 w-6 text-purple-500" />
              <span className="text-xl font-bold">Fondation</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Contact</Link>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>© 2025 Fondation</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}