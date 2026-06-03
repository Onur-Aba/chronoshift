"use client";

import { useState, useRef, useEffect } from "react";
import { DndContext, DragEndEvent, DragStartEvent, pointerWithin, useSensor, useSensors, PointerSensor, DragOverlay } from "@dnd-kit/core";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { LockPopup } from "@/components/ui/LockPopup";
import { AlertPopup } from "@/components/ui/AlertPopup";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAppStore } from "@/store/useAppStore";
import { ShiftPreset } from "@/types";
import { TextRotate } from "@/components/ui/TextRotate";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export default function Home() {
    const { currentState, updateAssignment, setAppState } = useAppStore();
    
    const [pendingAction, setPendingAction] = useState<{ cellId: string, preset: ShiftPreset } | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [activePreset, setActivePreset] = useState<ShiftPreset | null>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
        setIsMounted(true);
        workerRef.current = new Worker(new URL('../lib/optimizer.worker.ts', import.meta.url));
        
        workerRef.current.onmessage = (event) => {
            useAppStore.setState({ assignments: event.data, currentState: 'OTO_DIZILDI' });
            setIsOptimizing(false);
        };

        workerRef.current.onerror = (error) => {
            console.error("[ChronoShift Worker Hatası]:", error);
            setAlertMessage("Optimizasyon motorunda bir hata oluştu. Verilerinizi kontrol edin.");
            setIsOptimizing(false);
        };

        return () => workerRef.current?.terminate();
    }, []);

    const runOptimization = () => {
        const {
            employees,
            assignments,
            presets,
            globalTargetHours,
            useGlobalTargetHours,
            operationMode
        } = useAppStore.getState();

        if (employees.length === 0) {
            setAlertMessage("Takvimi oluşturabilmek için lütfen önce personel havuzuna kişi ekleyin.");
            return;
        }

        setIsOptimizing(true);
        workerRef.current?.postMessage({ employees, assignments, presets, days: DAYS, globalTargetHours, useGlobalTargetHours, operationMode });
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
        updateAssignment(cellId, preset.type, preset.startTime, preset.endTime, true);
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

    const scrollToWorkspace = () => {
        const workspace = document.getElementById("workspace");
        if (workspace) workspace.scrollIntoView({ behavior: "smooth" });
    };

    if (!isMounted) return null;

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
            <div className="min-h-screen w-full flex flex-col bg-background font-sans transition-colors duration-500 selection:bg-primary/30">
                
                <div className="sticky top-0 z-50">
                    <Header />
                </div>

                <AuroraBackground className="z-10">
                    <motion.div
                        initial={{ opacity: 0.0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.8, ease: "easeInOut" }}
                        className="relative flex flex-col gap-6 items-center justify-center px-4 max-w-4xl mx-auto text-center z-20"
                    >
                        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-primary/20 bg-background/50 backdrop-blur-md text-primary text-xs font-bold tracking-widest uppercase mb-2 shadow-sm">
                            Planlama Stüdyosu
                        </div>
                        
                        {/* MİMARİ DÜZELTME: Kelimeler artık dikey bir hiyerarşide, birbirlerini sıkıştırmazlar. */}
                        <h1 className="text-5xl md:text-7xl font-extrabold text-foreground tracking-tight leading-[1.1] flex flex-col items-center gap-3">
                            <span>Vardiya planlamanızı</span>
                            <TextRotate />
                            <span className="text-muted-foreground/70">yapın.</span>
                        </h1>
                        
                        <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed mt-4">
                            Operasyon ekipleri için tasarlanmış sade, hızlı ve kontrollü vardiya planlama paneli. Modunu seçin, personeli ekleyin ve haftalık planı net bir matriste yönetin.
                        </p>
                        
                        {/* MİMARİ DÜZELTME: Karanlık Mod Parlaması (Glow) eklendi! */}
                        <button 
                            onClick={scrollToWorkspace}
                            className="mt-8 px-8 py-4 bg-foreground text-background hover:bg-foreground/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-2xl shadow-foreground/20 dark:shadow-[0_0_30px_var(--color-primary)] transition-all active:scale-95 flex items-center gap-2 group"
                        >
                            Çalışma Alanına Git
                            <ChevronDown size={20} className="group-hover:translate-y-1 transition-transform" />
                        </button>
                    </motion.div>
                </AuroraBackground>

                <main id="workspace" className="min-h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)] w-full flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative z-10 border-t border-border/50 bg-background/50 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.2)]">
                    <CalendarBoard onOptimize={runOptimization} isOptimizing={isOptimizing} />
                    <Sidebar />
                </main>

                <Footer />
            </div>
            
            <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {activePreset ? (
                    <div style={{ borderLeft: `4px solid ${activePreset.color}`, background: `linear-gradient(135deg, ${activePreset.color}0F 0%, ${activePreset.color}05 100%)`, color: activePreset.color }} className="flex items-center border border-border bg-card/70 backdrop-blur-md shadow-2xl rounded-2xl scale-105 rotate-2 transition-transform overflow-hidden min-w-[280px]">
                        <div className="w-10 flex items-center justify-center border-r border-border/40 text-muted-foreground/60 py-5">
                            <span className="opacity-50 tracking-widest text-[8px] font-black rotate-[-90deg]">DRAG</span>
                        </div>
                        <div className="flex-1 p-4 flex justify-between items-center gap-3">
                            <div className="flex flex-col gap-0.5">
                                <span className="font-extrabold text-foreground text-sm tracking-tight">{activePreset.label}</span>
                            </div>
                            {activePreset.type !== 'IZIN' && (
                                <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1.5 rounded-lg border border-border/50 text-xs font-bold font-mono text-foreground shadow-inner">
                                    {activePreset.startTime} - {activePreset.endTime}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>

            <LockPopup isOpen={pendingAction !== null} onConfirm={handleConfirmLock} onDecline={handleDeclineLock} />
            <AlertPopup message={alertMessage} onClose={() => setAlertMessage(null)} />
        </DndContext>
    );
}