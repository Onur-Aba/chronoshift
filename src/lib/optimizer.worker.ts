export type ShiftType = 'SABAH' | 'AKSAM' | 'FULL' | 'IZIN' | 'BOS';

self.addEventListener("message", (event: MessageEvent<any>) => {
    const { employees, assignments, presets, days, globalTargetHours, useGlobalTargetHours } = event.data;
    const safeAssignments = assignments || [];

    if (!employees || employees.length === 0) { 
        self.postMessage(safeAssignments); 
        return; 
    }

    let currentAssignments = [...safeAssignments];
    const DAYS = days as string[];

    // 1. İZOLASYON: HERKESE 1 İZİN, 1 FULL. GERİSİ RASTGELE SABAH VEYA AKŞAM.
    employees.forEach((emp: any) => {
        let empAssignments = currentAssignments.filter((a: any) => a.employeeId === emp.id);
        
        DAYS.forEach(day => {
            const id = `${emp.id}-${day}`;
            if (!empAssignments.find((a: any) => a.id === id)) {
                const newAssign = { id, employeeId: emp.id, day, type: 'BOS', startTime: '', endTime: '', isLocked: false };
                currentAssignments.push(newAssign);
                empAssignments.push(newAssign);
            }
        });

        const locked = empAssignments.filter((a: any) => a.isLocked);
        const unlocked = empAssignments.filter((a: any) => !a.isLocked);
        
        let targets = { IZIN: 1, FULL: 1 };
        locked.forEach((a: any) => {
            if (a.type === 'IZIN') targets.IZIN--;
            if (a.type === 'FULL') targets.FULL--;
        });

        let pool: string[] = [];
        for(let i=0; i < Math.max(0, targets.IZIN); i++) pool.push('IZIN');
        for(let i=0; i < Math.max(0, targets.FULL); i++) pool.push('FULL');
        
        // KUSURSUZ MİMARİ: Geri kalan günleri rastgele Sabah/Akşam doldur. Asla 'BOS' ekleme!
        while(pool.length < unlocked.length) {
            pool.push(Math.random() > 0.5 ? 'SABAH' : 'AKSAM');
        }
        
        pool = pool.slice(0, unlocked.length);
        pool.sort(() => Math.random() - 0.5);

        unlocked.forEach((a: any, index: number) => {
            const type = pool[index] || 'AKSAM'; 
            a.type = type;
            if (type === 'IZIN') { 
                a.startTime = ''; a.endTime = ''; 
            } else {
                a.startTime = presets?.[type]?.startTime || (type === 'SABAH' ? '08:45' : type === 'FULL' ? '08:45' : '13:15');
                a.endTime = presets?.[type]?.endTime || (type === 'SABAH' ? '17:45' : type === 'FULL' ? '21:15' : '21:15');
            }
        });
    });

    const getMinutes = (time: string) => {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const getDiff = (s: string, e: string) => {
        if (!s || !e) return 0;
        const [sH, sM] = s.split(':').map(Number);
        const [eH, eM] = e.split(':').map(Number);
        let diff = (eH + eM/60) - (sH + sM/60);
        return diff < 0 ? diff + 24 : diff;
    };

    // 2. CEZA FONKSİYONU (Açılış/Kapanış ve Bireysel Saat Hassasiyeti)
    const calculateCost = (state: any[]) => {
        let cost = 0;
        
        DAYS.forEach((day, dayIndex) => {
            const dayAssigns = state.filter(a => a.day === day && a.type !== 'IZIN' && a.type !== 'BOS');
            const izinAssigns = state.filter(a => a.day === day && a.type === 'IZIN');
            
            if (dayAssigns.length === 0) cost += 10000000;
            else {
                // AÇILIŞ: Tam 2 Kişi
                const openers = dayAssigns.filter(a => getMinutes(a.startTime) <= 9 * 60).length;
                if (openers !== 2) cost += Math.abs(2 - openers) * 100000; 
                
                // KAPANIŞ: En az 3 Kişi
                const closers = dayAssigns.filter(a => getMinutes(a.endTime) >= 20 * 60 + 30).length;
                if (closers < 3) cost += (3 - closers) * 100000;
                else cost -= (closers - 3) * 5000; 
            }
            
            // Aynı gün 1'den fazla izin yasak
            if (izinAssigns.length > 1) cost += (izinAssigns.length - 1) * 200000; 
            
            // 11 Saat Dinlenme (Kapanış yapan açılış yapamaz)
            if (dayIndex < DAYS.length - 1) {
                const nextDay = DAYS[dayIndex + 1];
                dayAssigns.forEach(a => {
                    if (getMinutes(a.endTime) >= 21 * 60) { 
                        const nextAssign = state.find(n => n.employeeId === a.employeeId && n.day === nextDay);
                        if (nextAssign && nextAssign.type !== 'IZIN' && nextAssign.type !== 'BOS') {
                            if (getMinutes(nextAssign.startTime) <= 9 * 60) cost += 150000; 
                        }
                    }
                });
            }
        });

        // BİREYSEL SAAT CEZASI
        employees.forEach((emp: any) => {
            const empAssigns = state.filter(a => a.employeeId === emp.id && a.type !== 'IZIN' && a.type !== 'BOS');
            let totalHours = 0;
            empAssigns.forEach(a => totalHours += getDiff(a.startTime, a.endTime));
            
            const targetHours = useGlobalTargetHours ? globalTargetHours : emp.targetHours;
            // Saatleri dengelemek için güçlü ceza (Açılış/kapanışı bozmadan saatleri hedefe yaklaştırır)
            cost += Math.abs(totalHours - targetHours) * 2000; 
        });

        return cost;
    };

    // 3. KISITLI MUTASYON ALGORİTMASI
    let bestState = JSON.parse(JSON.stringify(currentAssignments));
    let bestCost = calculateCost(bestState);
    let temperature = 50000; 

    for (let i = 0; i < 60000; i++) {
        if (temperature < 0.1 || bestCost === 0) break; 

        const neighbor = JSON.parse(JSON.stringify(currentAssignments));
        const randomEmp = employees[Math.floor(Math.random() * employees.length)].id;
        const empAssigns = neighbor.filter((a:any) => a.employeeId === randomEmp && !a.isLocked);

        if (empAssigns.length > 0) {
            if (Math.random() > 0.5 && empAssigns.length >= 2) {
                // TAKAS (SWAP): Günleri kendi içinde yer değiştir.
                const idx1 = Math.floor(Math.random() * empAssigns.length);
                let idx2 = Math.floor(Math.random() * empAssigns.length);
                while(idx1 === idx2) idx2 = Math.floor(Math.random() * empAssigns.length);
                
                const tType = empAssigns[idx1].type;
                const tStart = empAssigns[idx1].startTime;
                const tEnd = empAssigns[idx1].endTime;

                empAssigns[idx1].type = empAssigns[idx2].type;
                empAssigns[idx1].startTime = empAssigns[idx2].startTime;
                empAssigns[idx1].endTime = empAssigns[idx2].endTime;

                empAssigns[idx2].type = tType;
                empAssigns[idx2].startTime = tStart;
                empAssigns[idx2].endTime = tEnd;
            } else {
                // KISITLI MUTASYON: Sadece Sabah'ı Akşam'a, Akşam'ı Sabah'a çevir!
                // Asla 'BOS', 'FULL' veya 'IZIN' yapma.
                const idx = Math.floor(Math.random() * empAssigns.length);
                const currentType = empAssigns[idx].type;
                
                if (currentType === 'SABAH' || currentType === 'AKSAM') {
                    const newType = currentType === 'SABAH' ? 'AKSAM' : 'SABAH';
                    empAssigns[idx].type = newType;
                    empAssigns[idx].startTime = presets?.[newType]?.startTime || (newType === 'SABAH' ? '08:45' : '13:15');
                    empAssigns[idx].endTime = presets?.[newType]?.endTime || (newType === 'SABAH' ? '17:45' : '21:15');
                }
            }
        }

        const newCost = calculateCost(neighbor);
        if (newCost < bestCost || Math.random() < Math.exp((bestCost - newCost) / temperature)) {
            currentAssignments = neighbor;
            if (newCost < bestCost) {
                bestCost = newCost;
                bestState = JSON.parse(JSON.stringify(currentAssignments));
            }
        }
        temperature *= 0.999;
    }
    self.postMessage(bestState);
});