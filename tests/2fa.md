# Tests für die Zwei-Faktor-Authentifizierung

Die Unit-Tests prüfen: 
- die Sperre vor der Speicherbestätigung
- abgelaufene und veraltete Einrichtungsdaten
- Hashen der Codes. 
- Nach erfolgreicher Bestätigung wird die aktuelle Sitzung verifiziert und der temporäre Einrichtungszustand gelöscht. 
- Die Admin-Tests prüfen erlaubte und verbotene Rollen sowie ein fehlendes Zielkonto.

```powershell
npx vitest run tests/unit/server/api/2fa reset-2fa.post.test.ts
```
