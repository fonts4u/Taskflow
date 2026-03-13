'use client';

import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
    return (
        <div className="flex h-screen bg-[#F8FAFC] text-[#134E4A] overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 ml-64">
                <Header />
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
