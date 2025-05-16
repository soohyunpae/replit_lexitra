import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* 헤더 - 간단한 네비게이션 */}
      <header className="bg-background border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lexitra</h1>
        <div className="space-x-2">
          <Link href="/auth">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/">
            <Button variant="default">Dashboard</Button>
          </Link>
        </div>
      </header>

      {/* Hero 섹션 */}
      <section className="bg-gray-950 text-white py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Translate less,<br />refine more.
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            AI writes the draft.<br />You shape the final voice.
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition">
              Try Lexitra Now
            </Button>
          </Link>
        </div>
      </section>

      {/* 기능 섹션 */}
      <section className="py-20 px-6 bg-muted text-center">
        <h2 className="text-3xl font-bold mb-10">What Lexitra Offers</h2>
        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="bg-card rounded-2xl shadow p-6 flex flex-col items-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-bold text-xl mb-2">AI Draft</h3>
            <p className="text-muted-foreground">Automatically generate initial translations with GPT</p>
          </div>
          <div className="bg-card rounded-2xl shadow p-6 flex flex-col items-center">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="font-bold text-xl mb-2">Segment Editing</h3>
            <p className="text-muted-foreground">Edit sentence by sentence with full control</p>
          </div>
          <div className="bg-card rounded-2xl shadow p-6 flex flex-col items-center">
            <div className="text-4xl mb-4">💾</div>
            <h3 className="font-bold text-xl mb-2">TM Integration</h3>
            <p className="text-muted-foreground">Store and reuse your approved translations</p>
          </div>
          <div className="bg-card rounded-2xl shadow p-6 flex flex-col items-center">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="font-bold text-xl mb-2">File Upload</h3>
            <p className="text-muted-foreground">Support for DOCX, PDF, and plain text files</p>
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-24 px-6 text-center bg-blue-900 text-white">
        <h2 className="text-3xl font-bold mb-4">Refine faster. Translate smarter.</h2>
        <p className="mb-8 text-lg">Experience the power of AI-assisted, human-refined translation.</p>
        <Link href="/">
          <Button size="lg" className="bg-white text-blue-800 font-semibold px-6 py-3 rounded-xl shadow hover:bg-gray-100 transition">
            Get Started for Free
          </Button>
        </Link>
      </section>

      {/* 푸터 */}
      <footer className="text-sm text-center py-6 text-muted-foreground bg-muted">
        © 2025 Lexitra. All rights reserved.
      </footer>
    </div>
  );
}