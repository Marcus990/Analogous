import React, { DragEvent } from "react";
import { HoloCard } from "./HoloCard";
import { BackgroundGradient } from "./BackgroundGradient";
import { FollowerPointerCard } from "./FollowingPointer";
import { AutoResizeText } from "./AutoResizeText";
import "./ExplainWords.css";

interface ExplainWordsProps {
  topicCard: string | null;
  audienceCard: string | null;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDropTopic: (e: DragEvent<HTMLDivElement>) => void;
  onDropAudience: (e: DragEvent<HTMLDivElement>) => void;
  onDragStartTopic: (e: DragEvent<HTMLDivElement>) => void;
  onDragStartAudience: (e: DragEvent<HTMLDivElement>) => void;
  onRemoveTopic?: (cardText: string) => void; // New prop for removing topic card
  onRemoveAudience?: (cardText: string) => void; // New prop for removing audience card
  isGenerating?: boolean; // New prop to disable removal during generation
}

export default function ExplainWords({
  topicCard,
  audienceCard,
  onDragOver,
  onDropTopic,
  onDropAudience,
  onDragStartTopic,
  onDragStartAudience,
  onRemoveTopic,
  onRemoveAudience,
  isGenerating = false,
}: ExplainWordsProps) {
  return (
    <div className="w-full mb-12 space-y-3 translate-y-8">
      {/* Row 1: Explain + Topic */}
      <div className="flex flex-col md:flex-row justify-center items-center px-8 gap-x-8 md:-translate-x-12">
        <div className="neonText">
          <div className="md:-translate-x-14">
            {["E", "x", "p", "l", "a", "in"].map((char, i) => (
              <span
                key={i}
                className={`${
                  i === 0
                    ? "flicker-fast"
                    : i === 1
                    ? "flicker-slow"
                    : i === 2
                    ? "flicker-medium"
                    : i === 4
                    ? "flicker-slow"
                    : ""
                } font-[PlantinMTProSemiBold] text-[5.5rem] md:text-[10rem] transition-transform duration-300 hover:scale-105`}
              >
                {char}
              </span>
            ))}{" "}
          </div>
        </div>

        <BackgroundGradient containerClassName="w-[240px] h-[100px] md:-translate-y-2">
          <div
            className="w-full h-full flex items-center justify-center"
            onDragOver={onDragOver}
            onDrop={onDropTopic}
          >
            {topicCard ? (
              <HoloCard
                text={topicCard}
                className="w-full h-full cursor-move"
                draggable
                onDragStart={onDragStartTopic}
                fillContainer={true}
                showRemoveButton={true}
                onRemove={isGenerating ? undefined : onRemoveTopic}
                disableRemove={isGenerating}
              />
            ) : (
              <div
                className="w-full text-center leading-snug break-words px-2 text-white"
                style={{
                  fontSize: "clamp(10px, 2vw, 16px)",
                  lineHeight: "1.2",
                  wordBreak: "break-word",
                }}
              >
                {""}
              </div>
            )}
          </div>
        </BackgroundGradient>
      </div>

      {/* Row 2: like / I'm / a / Role */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-x-16 px-8 md:translate-x-20">
        {["like", "I'm", "a"].map((word, idx) => (
          <span
            key={idx}
            className="font-[PlantinMTProLight] text-[4.5rem] md:text-[6rem] transition-transform duration-300 hover:scale-105"
          >
            {word}
          </span>
        ))}

        <BackgroundGradient containerClassName="w-[240px] h-[100px] md:-translate-y-2 md:translate-x-5">
          <div
            className="w-full h-full flex items-center justify-center"
            onDragOver={onDragOver}
            onDrop={onDropAudience}
          >
            {audienceCard ? (
              <HoloCard
                text={audienceCard}
                className="w-full h-full cursor-move"
                draggable
                onDragStart={onDragStartAudience}
                fillContainer={true}
                showRemoveButton={true}
                onRemove={isGenerating ? undefined : onRemoveAudience}
                disableRemove={isGenerating}
              />
            ) : (
              <div
                className="w-full text-center leading-snug break-words px-2 text-white"
                style={{
                  fontSize: "clamp(10px, 2vw, 16px)",
                  lineHeight: "1.2",
                  wordBreak: "break-word",
                }}
              >
                {""}
              </div>
            )}
          </div>
        </BackgroundGradient>
      </div>
    </div>
  );
}
