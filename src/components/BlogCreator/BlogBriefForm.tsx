"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface BlogBrief {
  topic: string;
  audience: "developers" | "devops" | "startups" | "enterprise";
  blogType: "tutorial" | "guide" | "announcement" | "case-study" | "deep-dive";
  tone: "technical" | "conversational" | "marketing";
  wordCount: number;
  keyPoints: string[];
}

interface BlogBriefFormProps {
  onSubmit: (brief: BlogBrief) => void;
  isLoading: boolean;
}

const SAMPLE_TOPICS = [
  "Deploy a FastAPI application to AWS with Defang",
  "Setting up a production-ready Node.js app with managed Postgres",
  "Migrating from Heroku to AWS using Defang",
  "Building a microservices architecture with Docker Compose and Defang",
  "CI/CD for containerized apps with GitHub Actions and Defang",
];

export default function BlogBriefForm({ onSubmit, isLoading }: BlogBriefFormProps) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState<BlogBrief["audience"]>("developers");
  const [blogType, setBlogType] = useState<BlogBrief["blogType"]>("tutorial");
  const [tone, setTone] = useState<BlogBrief["tone"]>("conversational");
  const [wordCount, setWordCount] = useState(1000);
  const [keyPointsText, setKeyPointsText] = useState("");

  const handleSubmit = () => {
    const keyPoints = keyPointsText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    onSubmit({
      topic,
      audience,
      blogType,
      tone,
      wordCount,
      keyPoints,
    });
  };

  const loadSampleTopic = () => {
    const random = SAMPLE_TOPICS[Math.floor(Math.random() * SAMPLE_TOPICS.length)];
    setTopic(random);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Blog Brief</CardTitle>
            <CardDescription>Describe what you want to write about</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadSampleTopic}>
            Random Topic
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Topic */}
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">
            Topic / Title Idea *
          </label>
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Deploy a Python Flask app to AWS in 5 minutes..."
            className="h-20 resize-none"
          />
        </div>

        {/* Grid: Audience, Type, Tone */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Audience */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Target Audience
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as BlogBrief["audience"])}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            >
              <option value="developers">Developers</option>
              <option value="devops">DevOps Engineers</option>
              <option value="startups">Startups</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Blog Type */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Blog Type
            </label>
            <select
              value={blogType}
              onChange={(e) => setBlogType(e.target.value as BlogBrief["blogType"])}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            >
              <option value="tutorial">Tutorial</option>
              <option value="guide">Guide</option>
              <option value="announcement">Announcement</option>
              <option value="case-study">Case Study</option>
              <option value="deep-dive">Technical Deep-Dive</option>
            </select>
          </div>

          {/* Tone */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as BlogBrief["tone"])}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            >
              <option value="conversational">Conversational</option>
              <option value="technical">Technical</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>
        </div>

        {/* Word Count Slider */}
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">
            Target Word Count: <span className="text-blue-600">{wordCount}</span>
          </label>
          <input
            type="range"
            min={500}
            max={2500}
            step={100}
            value={wordCount}
            onChange={(e) => setWordCount(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>500 (short)</span>
            <span>1500 (medium)</span>
            <span>2500 (long)</span>
          </div>
        </div>

        {/* Key Points */}
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">
            Key Points to Cover <span className="text-slate-400 font-normal">(optional, one per line)</span>
          </label>
          <Textarea
            value={keyPointsText}
            onChange={(e) => setKeyPointsText(e.target.value)}
            placeholder={"Compare to traditional Terraform approach\nInclude compose.yaml example\nMention managed Postgres support"}
            className="h-24 resize-none font-mono text-sm"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !topic.trim()}
          className={`w-full py-6 text-base transition-all duration-300 ${
            isLoading
              ? "bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-[length:200%_100%] animate-gradient"
              : ""
          }`}
          size="lg"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                <span className="h-2 w-2 rounded-full bg-white animate-bounce" />
              </span>
              <span>Creating blog...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Generate Blog Draft
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
