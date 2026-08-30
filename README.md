This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Port 3000 freigeben

Falls der Entwicklungsserver beendet wurde, Port 3000 aber weiterhin belegt ist,
kann der zugehörige Prozess je nach Umgebung mit einem der folgenden Befehle
beendet werden.

### Windows PowerShell

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```

Ermittelt über PowerShell den Prozess, der Port 3000 verwendet, und beendet ihn
sofort. Diesen Befehl in **PowerShell** ausführen.

### Git Bash unter Windows

```bash
kill -9 $(netstat -ano | grep ':3000' | awk '{print $5}' | head -n1)
```

Liest mit dem Windows-Befehl `netstat` die PID des ersten Prozesses auf Port 3000
aus und beendet ihn mit `SIGKILL`. Diesen Befehl in **Git Bash** ausführen. Er
funktioniert nur, wenn `kill` den betreffenden Windows-Prozess erreichen kann.

```bash
taskkill //F //PID $(netstat -ano | grep ':3000' | awk '{print $5}' | sort -u)
```

Ermittelt alle eindeutigen PIDs, die zu Port 3000 gefunden werden, und beendet
sie mit dem Windows-Programm `taskkill`. Diesen Befehl in **Git Bash** ausführen;
die doppelten Schrägstriche verhindern, dass Git Bash die Optionen als Pfade
interpretiert. Der Befehl ist in dieser Form nicht für die klassische **CMD**
geeignet, da CMD `$(...)`, `grep` und `awk` nicht unterstützt.

### WSL oder Linux-Bash

```bash
fuser -k 3000/tcp
```

Sucht den Prozess, der den TCP-Port 3000 verwendet, und beendet ihn. Diesen
Befehl in einer **WSL- oder Linux-Bash** ausführen; `fuser` muss installiert sein.

Alternativ:

```bash
kill -9 $(lsof -t -i:3000)
```

Lässt `lsof` die PID aller Prozesse auf Port 3000 ausgeben und beendet sie mit
`SIGKILL`. Diesen Befehl in einer **WSL- oder Linux-Bash** ausführen; `lsof` muss
installiert sein.

### Prüfen, ob die Bash unter WSL läuft

```bash
grep -qi microsoft /proc/version && echo "WSL" || echo "Not WSL"
```

Prüft in einer **Bash**, ob die Kernel-Versionsangabe den Begriff `microsoft`
enthält. Gibt dann `WSL` oder `Not WSL` aus. Unter einer normalen Windows-CMD
oder PowerShell steht `/proc/version` nicht zur Verfügung.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
