'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Task } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CheckSquare, Plus, Trash2, Edit, LogOut, Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadTasks();
    }
  }, [user, authLoading, router]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            user_id: user.id,
            title: newTaskTitle,
            description: newTaskDescription,
            completed: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: editingTask.title,
          description: editingTask.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTask.id)
        .select()
        .single();

      if (error) throw error;
      setTasks(tasks.map((t) => (t.id === data.id ? data : t)));
      setEditingTask(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          completed: !task.completed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
        .select()
        .single();

      if (error) throw error;
      setTasks(tasks.map((t) => (t.id === data.id ? data : t)));
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-4 max-w-4xl">
        <header className="mb-8 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2.5">
                <CheckSquare className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Mis Tareas</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">Pendientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-sm text-muted-foreground">Completadas</div>
              </CardContent>
            </Card>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Tarea</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Ej: Comprar víveres"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Detalles adicionales..."
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddTask}>Crear Tarea</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No tienes tareas aún</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crea tu primera tarea para comenzar
                </p>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleComplete(task)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-medium text-foreground ${
                          task.completed ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p
                          className={`text-sm mt-1 ${
                            task.completed ? 'text-muted-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {task.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(task.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTask(task);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Tarea</DialogTitle>
            </DialogHeader>
            {editingTask && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Título</Label>
                  <Input
                    id="edit-title"
                    value={editingTask.title}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Textarea
                    id="edit-description"
                    value={editingTask.description || ''}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateTask}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
