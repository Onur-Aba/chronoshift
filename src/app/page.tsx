"use client";

import { useState, useRef, useEffect } from "react";
import { DndContext, DragEndEvent, DragStartEvent, pointerWithin, useSensor, useSensors, PointerSensor, DragOverlay } from "@dnd-kit/core";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import { Sidebar } from "@/components/sidebar/Sidebar"; // KUSURSUZ İTHALAT (EmployeePool GİTTİ)
import { LockPopup } from "@/components/ui/LockPopup";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAppStore } from "@/store/useAppStore";
import { ShiftPreset } from "@/types";

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export default function Home() {
    const { currentState, updateAssignment, setAppState, assignments, employees, presets, globalTargetHours, useGlobalTargetHours } = useAppStore();
    
    const [pendingAction, setPendingAction] = useState<{ cellId: string, preset: ShiftPreset } | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [activePreset, setActivePreset] = useState<ShiftPreset | null>(null);
    const workerRef = useRef<Worker | null>(null);
    
    // MİMARİ KALKAN: Next.js Hydration Uyuşmazlığını (ARIA ID) engeller.
    const [isMounted, setIsMounted] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
        setIsMounted(true); // İstemciye (Browser) güvenli geçiş yapıldı.
        
        workerRef.current = new Worker(new URL('../lib/optimizer.worker.ts', import.meta.url));
        
        workerRef.current.onmessage = (event) => {
            useAppStore.setState({ assignments: event.data, currentState: 'OTO_DIZILDI' });
            setIsOptimizing(false);
        };

        // YENİ: Sessiz çökmeleri önleyen Hata Yakalayıcı
        workerRef.current.onerror = (error) => {
            console.error("[ChronoShift Worker Hatası]:", error);
            alert("Algoritma çalışırken bir sorun oluştu! (Konsolu kontrol et)");
            setIsOptimizing(false);
        };

        return () => workerRef.current?.terminate();
    }, []);

    const runOptimization = () => {
        if (employees.length === 0) return alert("Önce personel eklemelisin.");
        setIsOptimizing(true);
        
        // MİMARİ DÜZELTME: globalTargetHours ve useGlobalTargetHours artık yapay zekaya gönderiliyor!
        workerRef.current?.postMessage({ 
            employees, 
            assignments, 
            presets, 
            days: DAYS,
            globalTargetHours,
            useGlobalTargetHours
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        const presetData = event.active.data.current?.preset as ShiftPreset;
        if (presetData) setActivePreset(presetData);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActivePreset(null);
        const { active, over } = event;
        if (!over) return;

        const cellId = over.id.toString();
        const preset = active.data.current?.preset as ShiftPreset;
        if (!preset) return;

        if (currentState === 'OTO_DIZILDI') {
            setPendingAction({ cellId, preset });
            return;
        }
        updateAssignment(cellId, preset.type, preset.startTime, preset.endTime, false);
    };

    const handleConfirmLock = () => { 
        if (!pendingAction) return; 
        updateAssignment(pendingAction.cellId, pendingAction.preset.type, pendingAction.preset.startTime, pendingAction.preset.endTime, true); 
        setPendingAction(null); 
        runOptimization(); 
    };

    const handleDeclineLock = () => { 
        if (!pendingAction) return; 
        updateAssignment(pendingAction.cellId, pendingAction.preset.type, pendingAction.preset.startTime, pendingAction.preset.endTime, false); 
        setAppState('ELLE_DIZILIYOR'); 
        setPendingAction(null); 
    };

    // HYDRATION KALKANI DEVREDE: Bileşen sunucuda render edilmeyecek.
    if (!isMounted) return null;

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
            <div className="h-screen w-full flex flex-col bg-background overflow-hidden font-sans transition-colors">
                <Header />
                <main className="flex-1 w-full flex flex-row overflow-hidden relative z-10">
                    <CalendarBoard onOptimize={runOptimization} isOptimizing={isOptimizing} />
                    <Sidebar />
                </main>
                <Footer />
            </div>
            
            <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {activePreset ? (
                    <div className="bg-card border border-border shadow-2xl p-3 rounded-xl font-bold text-sm text-foreground scale-105 rotate-2">
                        {activePreset.label} <span className="opacity-50 ml-1 text-xs">({activePreset.type === 'IZIN' ? 'Off-Day' : `${activePreset.startTime} - ${activePreset.endTime}`})</span>
                    </div>
                ) : null}
            </DragOverlay>

            <LockPopup isOpen={pendingAction !== null} onConfirm={handleConfirmLock} onDecline={handleDeclineLock} />
        </DndContext>
    );
}