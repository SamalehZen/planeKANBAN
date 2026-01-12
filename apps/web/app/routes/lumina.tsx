import React from 'react';
import { ThemeProvider } from '../../core/compat/next-themes';
import { ThemeToggle } from '../../core/components/ui/theme-toggle';
import { ArrowRight, Check, Zap, Shield, Layout } from 'lucide-react';

export default function LuminaPage() {
    return (
        <ThemeProvider>
            <div className="min-h-screen w-full flex flex-col font-sans transition-colors duration-200 bg-background relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }}>
                </div>

                {/* Ambient Glow */}
                <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none z-0" />

                {/* Navigation */}
                <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
                    <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-6xl">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground">
                                <Layout size={18} />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-foreground">Lumina</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                                <a href="#" className="hover:text-foreground transition-colors">Features</a>
                                <a href="#" className="hover:text-foreground transition-colors">Showcase</a>
                                <a href="#" className="hover:text-foreground transition-colors">Docs</a>
                            </nav>
                            <div className="h-6 w-px bg-border/60 hidden md:block" />
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <main className="flex-1 container mx-auto px-4 pt-20 pb-32 max-w-6xl z-10">
                    <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">

                        {/* Badge */}
                        <div className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm font-medium text-secondary-foreground backdrop-blur-sm animate-fade-in-up">
                            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                            v2.0 Now Available
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                            The Ultimate <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 animate-gradient-x">
                                Dark Mode Experience
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                            Switch themes with a cinematic circular transition. Built with the View Transitions API and Zustand for seamless state management.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full justify-center">
                            <button className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-transform active:scale-95 shadow-lg shadow-primary/20">
                                Get Started
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </button>
                            <button className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-border bg-background/50 text-foreground font-medium text-lg hover:bg-muted/50 transition-colors backdrop-blur-sm">
                                View on GitHub
                            </button>
                        </div>

                        {/* Features Mini-Grid */}
                        <div className="pt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground font-medium">
                            <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-primary" /> Zero Flickering</div>
                            <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-primary" /> Persistent State</div>
                            <div className="flex items-center"><Check className="h-4 w-4 mr-2 text-primary" /> System Sync</div>
                        </div>
                    </div>

                    {/* Visual Showcase / Mockup */}
                    <div className="mt-20 relative mx-auto w-full max-w-5xl perspective-1000 group">
                        {/* Glow effect behind the card */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl rounded-[3rem] -z-10 transform group-hover:scale-105 transition-transform duration-700" />

                        <div className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-primary/10">
                            {/* Mock Browser Header */}
                            <div className="h-12 border-b border-border bg-muted/30 flex items-center px-4 gap-2">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                                </div>
                                <div className="ml-4 flex-1 flex justify-center">
                                    <div className="h-6 w-1/3 max-w-[200px] bg-background/50 rounded-md border border-border/50" />
                                </div>
                            </div>

                            {/* Mock Content */}
                            <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="space-y-6">
                                    <div className="h-8 w-3/4 bg-foreground/10 rounded animate-pulse" />
                                    <div className="space-y-3">
                                        <div className="h-4 w-full bg-foreground/5 rounded" />
                                        <div className="h-4 w-5/6 bg-foreground/5 rounded" />
                                        <div className="h-4 w-4/6 bg-foreground/5 rounded" />
                                    </div>
                                    <div className="flex gap-4 pt-2">
                                        <div className="h-10 w-24 bg-primary rounded-lg shadow-lg shadow-primary/20" />
                                        <div className="h-10 w-24 bg-muted rounded-lg" />
                                    </div>
                                </div>

                                {/* Abstract UI Elements */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-background border border-border shadow-sm">
                                        <Zap className="h-8 w-8 text-yellow-500 mb-3" />
                                        <div className="h-4 w-20 bg-foreground/10 rounded mb-2" />
                                        <div className="h-3 w-12 bg-foreground/5 rounded" />
                                    </div>
                                    <div className="p-4 rounded-xl bg-background border border-border shadow-sm">
                                        <Shield className="h-8 w-8 text-blue-500 mb-3" />
                                        <div className="h-4 w-20 bg-foreground/10 rounded mb- now2" />
                                        <div className="h-3 w-12 bg-foreground/5 rounded" />
                                    </div>
                                    <div className="col-span-2 p-4 rounded-xl bg-gradient-to-r from-secondary to-background border border-border flex items-center justify-between">
                                        <div className="space-y-2">
                                            <div className="h-4 w-24 bg-foreground/10 rounded" />
                                            <div className="h-3 w-32 bg-foreground/5 rounded" />
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-foreground/5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </ThemeProvider>
    );
}
