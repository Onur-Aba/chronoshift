export type ShiftType = 'SABAH' | 'AKSAM' | 'FULL' | 'IZIN' | 'BOS';

self.addEventListener("message", (event: MessageEvent<any>) => {
    const { employees, assignments, presets, days } = event.data;
    const safeAssignments = assignments || [];

    if (!employees || employees.length === 0) { 
        self.postMessage(safeAssignments); 
        return; 
    }

    let currentAssignments = [...safeAssignments];
    const DAYS = days as string[];

    // 1. İZOLASYON: KUSURSUZ DNA DAĞITIMI
    employees.forEach((emp: any) => {
        let empAssignments = currentAssignments.filter((a: any) => a.employeeId === emp.id);
        
        // Eksik günleri tamamla
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
        
        // KUSURSUZ HAFTALIK DNA KOTASI (1 İzin, 1 Full, 2 Sabah, 3 Akşam = 7 Gün)
        let targets: Record<string, number> = { IZIN: 1, FULL: 1, SABAH: 2, AKSAM: 3 };
        
        locked.forEach((a: any) => {
            if (targets[a.type] !== undefined) targets[a.type]--;
        });

        let pool: string[] = [];
        for(let i=0; i < Math.max(0, targets.IZIN); i++) pool.push('IZIN');
        for(let i=0; i < Math.max(0, targets.FULL); i++) pool.push('FULL');
        for(let i=0; i < Math.max(0, targets.SABAH); i++) pool.push('SABAH');
        for(let i=0; i < Math.max(0, targets.AKSAM); i++) pool.push('AKSAM');
        
        // Kilitlerden dolayı boşluk kalırsa Akşam ile doldur (Asla BOS bırakma)
        while(pool.length < unlocked.length) pool.push('AKSAM');
        pool = pool.slice(0, unlocked.length);
        
        // Havuzu rastgele karıştır
        pool.sort(() => Math.random() - 0.5);

        // Kilitsiz günlere DNA'yı zerk et
        unlocked.forEach((a: any, index: number) => {
            const type = pool[index]; 
            a.type = type;
            if (type === 'IZIN' || type === 'BOS') { 
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

    // 2. MUTLAK CEZA FONKSİYONU
    const calculateCost = (state: any[]) => {
        let cost = 0;
        
        // GÜNLÜK MAĞAZA KURALLARI
        DAYS.forEach((day, dayIndex) => {
            const dayAssigns = state.filter(a => a.day === day && a.type !== 'IZIN' && a.type !== 'BOS');
            const izinAssigns = state.filter(a => a.day === day && a.type === 'IZIN');
            
            if (dayAssigns.length === 0) cost += 10000000; // Kapalı mağaza felakettir
            else {
                // AÇILIŞ: Tam 2 kişi
                const openers = dayAssigns.filter(a => getMinutes(a.startTime) <= 9 * 60).length;
                if (openers !== 2) cost += Math.abs(2 - openers) * 100000; 
                
                // KAPANIŞ: En az 3 kişi
                const closers = dayAssigns.filter(a => getMinutes(a.endTime) >= 20 * 60 + 30).length;
                if (closers < 3) cost += (3 - closers) * 100000;
                else cost -= (closers - 3) * 5000; // Akşama yığılmayı teşvik et
            }
            
            // Aynı gün 1'den fazla izin yasak
            if (izinAssigns.length > 1) cost += (izinAssigns.length - 1) * 200000; 
            
            // 11 Saat Dinlenme (Kapanıştan çıkıp açılışa gelmek yasak)
            if (dayIndex < DAYS.length - 1) {
                const nextDay = DAYS[dayIndex + 1];
                dayAssigns.forEach(a => {
                    if (getMinutes(a.endTime) >= 21 * 60) { 
                        const nextAssign = state.find(n => n.employeeId === a.employeeId && n.day === nextDay);
                        if (nextAssign && nextAssign.type !== 'IZIN' && nextAssign.type !== 'BOS') {
                            if (getMinutes(nextAssign.startTime) <= 9 * 60) cost += 200000; 
                        }
                    }
                });
            }
        });

        // BİREYSEL KOTA KURALLARI (DNA KORUMASI)
        employees.forEach((emp: any) => {
            const empAssigns = state.filter(a => a.employeeId === emp.id);
            
            const izinCount = empAssigns.filter(a => a.type === 'IZIN').length;
            const fullCount = empAssigns.filter(a => a.type === 'FULL').length;
            const sabahCount = empAssigns.filter(a => a.type === 'SABAH').length;

            // ASLA İZİN VE FULL GÜNÜNÜ SİLME VEYA ÇOĞALTMA!
            if (izinCount !== 1) cost += Math.abs(1 - izinCount) * 500000;
            if (fullCount !== 1) cost += Math.abs(1 - fullCount) * 500000;
            
            // SABAH YIĞILMASINI ENGELLE (Maksimum 2 sabah)
            if (sabahCount > 2) cost += (sabahCount - 2) * 50000;
        });

        return cost;
    };

    // 3. TAVLAMA ALGORİTMASI
    let bestState = JSON.parse(JSON.stringify(currentAssignments));
    let bestCost = calculateCost(bestState);
    let temperature = 50000; 

    for (let i = 0; i < 60000; i++) {
        if (temperature < 0.1 || bestCost === 0) break; 

        const neighbor = JSON.parse(JSON.stringify(currentAssignments));
        const randomEmp = employees[Math.floor(Math.random() * employees.length)].id;
        const empAssigns = neighbor.filter((a:any) => a.employeeId === randomEmp && !a.isLocked);

        if (empAssigns.length > 0) {
            // Çoğunlukla sadece yer değiştir (Swap)
            if (Math.random() > 0.3 && empAssigns.length >= 2) {
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
                // Kısıtlı Mutasyon: Mağazanın dengesi için gerekirse Sabah'ı Akşam'a çevir
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