import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTerminals, Terminal } from '@/hooks/useTerminals';
import { useProductionLines } from '@/hooks/useProductionData';
import { Plus, Pencil, Trash2, Monitor, Wifi, WifiOff, Factory, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function TerminalsManagement() {
  const { terminals, loading, createTerminal, updateTerminal, deleteTerminal } = useTerminals();
  const { lines } = useProductionLines();
  const [isOpen, setIsOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    device_uid: '',
    ip_address: '',
    line_id: '',
  });

  const resetForm = () => {
    setFormData({ name: '', device_uid: '', ip_address: '', line_id: '' });
    setEditingTerminal(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleEdit = (terminal: Terminal) => {
    setEditingTerminal(terminal);
    setFormData({
      name: terminal.name,
      device_uid: terminal.device_uid,
      ip_address: terminal.ip_address || '',
      line_id: terminal.line_id || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const terminalData = {
      name: formData.name,
      device_uid: formData.device_uid,
      ip_address: formData.ip_address || null,
      line_id: formData.line_id || null,
    };

    let success: boolean;
    if (editingTerminal) {
      success = await updateTerminal(editingTerminal.id, terminalData);
    } else {
      success = await createTerminal(terminalData);
    }

    if (success) {
      handleOpenChange(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce terminal ?')) {
      await deleteTerminal(id);
    }
  };

  const handleToggleOnline = async (terminal: Terminal) => {
    await updateTerminal(terminal.id, { is_online: !terminal.is_online });
  };

  // Get line name by id
  const getLineName = (lineId: string | null) => {
    if (!lineId) return null;
    const line = lines.find(l => l.id === lineId);
    return line?.name || null;
  };

  // Get available lines (not assigned to other terminals)
  const availableLines = lines.filter(line => {
    const assignedTerminal = terminals.find(t => t.line_id === line.id);
    return !assignedTerminal || (editingTerminal && assignedTerminal.id === editingTerminal.id);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Monitor className="w-7 h-7 text-primary" />
          Terminaux (Kiosks)
        </h2>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau terminal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTerminal ? 'Modifier le terminal' : 'Nouveau terminal'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom d'affichage</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Terminal Ligne 1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="device_uid">Nom de l'ordinateur</Label>
                <Input
                  id="device_uid"
                  value={formData.device_uid}
                  onChange={(e) => setFormData({ ...formData, device_uid: e.target.value })}
                  placeholder="DESKTOP-ABC123 ou LAPTOP-XYZ"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Identifiant unique de la machine (hostname)
                </p>
              </div>
              <div>
                <Label htmlFor="ip_address">Adresse IP (optionnel)</Label>
                <Input
                  id="ip_address"
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  placeholder="192.168.1.100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Adresse IP locale ou fixe du terminal
                </p>
              </div>
              <div>
                <Label htmlFor="line_id">Ligne de production assignée</Label>
                <Select
                  value={formData.line_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, line_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une ligne (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune ligne</SelectItem>
                    {availableLines.map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Chaque ligne ne peut être assignée qu'à un seul terminal
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingTerminal ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="industrial-card">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : terminals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Aucun terminal</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Ordinateur</TableHead>
                <TableHead>Adresse IP</TableHead>
                <TableHead>Ligne assignée</TableHead>
                <TableHead>Dernier ping</TableHead>
                <TableHead className="text-center">En ligne</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terminals.map((terminal) => (
                <TableRow key={terminal.id}>
                  <TableCell className="font-medium">{terminal.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {terminal.device_uid}
                    </code>
                  </TableCell>
                  <TableCell>
                    {terminal.ip_address ? (
                      <Badge variant="outline" className="gap-1 font-mono text-xs">
                        <Globe className="w-3 h-3" />
                        {terminal.ip_address}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {terminal.line_id ? (
                      <Badge variant="outline" className="gap-1">
                        <Factory className="w-3 h-3" />
                        {getLineName(terminal.line_id)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {terminal.last_ping
                      ? formatDistanceToNow(new Date(terminal.last_ping), { addSuffix: true, locale: fr })
                      : 'Jamais'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {terminal.is_online ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Switch
                        checked={terminal.is_online}
                        onCheckedChange={() => handleToggleOnline(terminal)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(terminal)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(terminal.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
