import React from 'react';

export default function EmptyState({ icon: Icon, title, description }) {
    return (
        <div className="flex flex-col items-center justify-center text-center text-gray-500">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] text-[#10B981]">
                <Icon className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-gray-800">{title}</h4>
            <p className="mt-2 max-w-xl text-sm leading-relaxed">{description}</p>
        </div>
    );
};

