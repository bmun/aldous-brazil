import React from "react";

import Image from 'next/image';

interface GuidePanelProps {
  topicTitle: string,
  imgSrc: string,
  helpfulSnippet: string,
  invert: boolean
}

function GuidePanel({ topicTitle, imgSrc, helpfulSnippet, invert }: GuidePanelProps) {
  return (
    <div className={`card bg-base-100 shadow-xl border-2 border-primary flex flex-col ${invert ? "lg:flex-row-reverse" : "lg:flex-row"} gap-6 p-4 items-start w-full mx-auto`}>
      {/* Video */}
      <div className="w-full aspect-video rounded-lg border-2 border-primary flex flex-row items-center justify-center bg-base-200">
        <Image
          src={imgSrc}
          alt="Reg Guide"
          width={650}
          height={200}
        />
      </div>

      {/* Text */}
      <div className="flex flex-col lg:w-9/12 justify-start">
        <h4 className="text-5xl text-primary mb-2">{topicTitle}</h4>
        <p className="text-xl font-bold text-base-content">{helpfulSnippet}</p>
      </div>
    </div>
  );
}

export default GuidePanel;

