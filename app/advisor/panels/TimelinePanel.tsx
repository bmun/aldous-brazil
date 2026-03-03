'use client';

import React from "react";
import { format } from "date-fns";
import { currentConference, registrationNumber } from "@/app/utils/supabaseHelpers";

const isValidDate = (value: any): boolean => {
  if (typeof value !== "string") return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
};

const toReadableLabel = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace("end", "ends")
    .replace("ends date", "end date")
    .replace("open", "opens")
    .replace("close", "closes")
    .replace("reg", "registration")
    .replace("part ", "partial ")
    .replace("avail date", "avaliable")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const parseDateOnly = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

function TimelinePanel() {
  const dateEntries = Object.entries(currentConference)
    .filter(([_, value]) => isValidDate(value))
  .map(([key, value]) => ({ key, date: parseDateOnly(value as string) })) // <-- use parseDateOnly here
  .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="card bg-base-100 shadow-xl border-2 border-primary w-full">
      <div className="card-body overflow-scroll text-base-content">
        <h6 className="text-5xl text-center p-4">
            {(() => {
                const startDateStr = currentConference?.conference_begins;
                if (!isValidDate(startDateStr)) return "Start date unknown";
                
                const startDate = parseDateOnly(startDateStr);
                const today = new Date();
                const diffInMs = startDate.getTime() - today.getTime();
                const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

                return diffInDays > 0
                ? `${diffInDays} day${diffInDays !== 1 ? "s" : ""} until conference`
                : diffInDays === 0
                ? "Conference starts today!"
                : "Conference has already started";
            })()}
        </h6>
        <h6 className="text-5xl text-center px-4 pb-6 text-primary">
            {registrationNumber} delegates registered
        </h6>
        <ul className="timeline timeline-vertical">
            {dateEntries.map((entry, index) => {
            const sideClass = index % 2 === 0 ? "timeline-start" : "timeline-end";
            const isFirst = index === 0;
            const isLast = index === dateEntries.length - 1;
            const isPassed = entry.date.getTime() < new Date().getTime();

            return (
                <li key={entry.key}>
                {!isFirst && <hr className={isPassed ? "bg-secondary" : "bg-base-300"} />}
                <div className="timeline-middle">
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={isPassed ? "text-secondary h-5 w-5" : "text-primary bg-primary h-4 w-4 rounded-full m-0.5"}
                    >
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                    />
                    </svg>
                </div>
                <div className={`${sideClass} hover:scale-110 transform transition-transform duration-300 hover:cursor-pointer timeline-box w-full ${!isPassed ? "bg-primary text-primary-content border-base-300" : "bg-secondary text-secondary-content border-base-300"}`}>
                    <div className="flex flex-row gap-2 items-center justify-between">
                    <h3 className="font-bold text-2xl">{toReadableLabel(entry.key)}</h3>
                        {isPassed ?  
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-6 w-6 opacity-90"
                                >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        : <div/>}
                    </div>
                    <p className="text-lg">{format(entry.date, "PP")}</p>
                </div>
                {!isLast && <hr className={isPassed ? "bg-secondary" : "bg-base-300"} />}
                </li>
            );
            })}
        </ul>
      </div>
    </div>
  );
}

export default TimelinePanel;
