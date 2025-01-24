import { FC, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useSession } from "next-auth/react";
import { Modal } from '../ReusableComponents/Modal';
import { doGetProjectsOp, doReadMemoryOp, doEditMemoryOp, doRemoveMemoryOp } from '../../services/memoryService';

interface Props {
    open: boolean;
    onClose: () => void;
}

interface Memory {
    MemoryItem: string;
    MemoryType: string;
    MemoryTypeID: string;
    CreatedAt: string;
    id: string;
}

interface ProjectResponse {
    user: string;
    project: string;
    id: string;
    timestamp: string;
}

interface UserMemoryResponse {
    content: string;
    user: string;
    memory_type: string;
    id: string;
    timestamp: string;
    memory_type_id: string;
}

interface AssistantContentProps {
    selectedAssistant: string | null;
    memories: Memory[];
    assistantMemories: Memory[];
}

const AssistantContent: FC<AssistantContentProps> = ({
    selectedAssistant,
    memories,
    assistantMemories
}) => {
    return (
        <div className="overflow-x-auto">
            {selectedAssistant ? (
                <>
                    <h2 className="text-xl mb-4">
                        {memories.find(a => a.id === selectedAssistant)?.MemoryItem}
                    </h2>
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="border-b dark:border-neutral-700">
                                <th className="px-4 py-2 text-left">Memory</th>
                                <th className="px-4 py-2 text-left">Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assistantMemories.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="text-center py-4">
                                        No memories for this assistant
                                    </td>
                                </tr>
                            ) : (
                                assistantMemories.map((memory) => (
                                    <tr key={memory.id} className="border-b dark:border-neutral-700">
                                        <td className="px-4 py-2">{memory.MemoryItem}</td>
                                        <td className="px-4 py-2">
                                            {new Date(memory.CreatedAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </>
            ) : (
                <div className="text-center py-4">
                    Select an assistant from the sidebar to view its memories
                </div>
            )}
        </div>
    );
};

export const MemoryDialog: FC<Props> = ({ open, onClose }) => {
    const { t } = useTranslation('memory');
    const [activeTab, setActiveTab] = useState<'User' | 'Projects' | 'Assistants'>('User');
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingMemory, setEditingMemory] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [projectMemories, setProjectMemories] = useState<Memory[]>([]);
    const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
    const [assistantMemories, setAssistantMemories] = useState<Memory[]>([]);

    const { data: session } = useSession();
    const userEmail = session?.user?.email;

    const handleEdit = (memory: Memory) => {
        setEditingMemory(memory.id);
        setEditContent(memory.MemoryItem);
    };

    const handleCancelEdit = () => {
        setEditingMemory(null);
        setEditContent('');
    };

    const handleSaveEdit = async (memoryId: string) => {
        try {
            const response = await doEditMemoryOp(memoryId, editContent);
            if (response.statusCode === 200) {
                // Refresh memories after successful edit
                const updatedResponse = await doReadMemoryOp();
                if (updatedResponse.statusCode === 200) {
                    const body = JSON.parse(updatedResponse.body);
                    const userMemories = body.memories.filter(
                        (memory: UserMemoryResponse) => memory.memory_type === 'user'
                    );
                    setMemories(userMemories.map((memory: UserMemoryResponse) => ({
                        MemoryItem: memory.content,
                        MemoryType: memory.memory_type,
                        MemoryTypeID: memory.memory_type_id,
                        CreatedAt: memory.timestamp,
                        id: memory.id
                    })));
                }
            }
        } catch (error) {
            console.error('Error editing memory:', error);
        }
        setEditingMemory(null);
        setEditContent('');
    };

    const handleDelete = async (memoryId: string) => {
        if (window.confirm('Are you sure you want to delete this memory?')) {
            try {
                const response = await doRemoveMemoryOp(memoryId);
                if (response.statusCode === 200) {
                    // Refresh memories after successful deletion
                    const updatedResponse = await doReadMemoryOp();
                    if (updatedResponse.statusCode === 200) {
                        const body = JSON.parse(updatedResponse.body);
                        const userMemories = body.memories.filter(
                            (memory: UserMemoryResponse) => memory.memory_type === 'user'
                        );
                        setMemories(userMemories.map((memory: UserMemoryResponse) => ({
                            MemoryItem: memory.content,
                            MemoryType: memory.memory_type,
                            MemoryTypeID: memory.memory_type_id,
                            CreatedAt: memory.timestamp
                        })));
                    }
                }
            } catch (error) {
                console.error('Error deleting memory:', error);
            }
        }
    };

    const projectContent = activeTab === 'Projects' && (
        <div className="flex h-full">
            <div className="w-48 border-r dark:border-neutral-700">
                {memories.map((project) => (
                    <button
                        key={project.id}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 
                        ${selectedProject === project.id ? 'bg-gray-200 dark:bg-neutral-600' : ''}`}
                        onClick={() => setSelectedProject(project.id)}
                    >
                        {project.MemoryItem}
                    </button>
                ))}
            </div>

            <div className="flex-1 p-4">
                {selectedProject ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="border-b dark:border-neutral-700">
                                    <th className="px-4 py-2 text-left">Memory</th>
                                    <th className="px-4 py-2 text-left">Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectMemories.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="text-center py-4">No memories for this project</td>
                                    </tr>
                                ) : (
                                    projectMemories.map((memory) => (
                                        <tr key={memory.id} className="border-b dark:border-neutral-700">
                                            <td className="px-4 py-2">{memory.MemoryItem}</td>
                                            <td className="px-4 py-2">{new Date(memory.CreatedAt).toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-4">Select a project to view its memories</div>
                )}
            </div>
        </div>
    );

    const loadMemories = async () => {
        if (!userEmail) return;

        setIsLoading(true);
        try {
            switch (activeTab) {
                case 'Projects':
                    const projectResponse = await doGetProjectsOp(userEmail);
                    if (projectResponse.statusCode === 200) {
                        const body = JSON.parse(projectResponse.body);
                        const projects: ProjectResponse[] = body.projects;

                        setMemories(projects.map((project) => ({
                            MemoryItem: project.project,
                            MemoryType: 'Project',
                            MemoryTypeID: project.id,
                            CreatedAt: project.timestamp,
                            id: project.id
                        })));

                        // If a project is selected, load its memories
                        if (selectedProject) {
                            const memoryResponse = await doReadMemoryOp();
                            if (memoryResponse.statusCode === 200) {
                                const memoryBody = JSON.parse(memoryResponse.body);
                                const projectMemories = memoryBody.memories.filter(
                                    (memory: UserMemoryResponse) => memory.memory_type_id === selectedProject
                                );
                                setProjectMemories(projectMemories.map((memory: UserMemoryResponse) => ({
                                    MemoryItem: memory.content,
                                    MemoryType: memory.memory_type,
                                    MemoryTypeID: memory.memory_type_id,
                                    CreatedAt: memory.timestamp,
                                    id: memory.id
                                })));
                            }
                        }
                    }
                    break;
                case 'User':
                    const userResponse = await doReadMemoryOp();
                    if (userResponse.statusCode === 200) {
                        const body = JSON.parse(userResponse.body);
                        const userMemories = body.memories.filter(
                            (memory: UserMemoryResponse) => memory.memory_type === 'user'
                        );
                        setMemories(userMemories.map((memory: UserMemoryResponse) => ({
                            MemoryItem: memory.content,
                            MemoryType: memory.memory_type,
                            MemoryTypeID: memory.memory_type_id,
                            CreatedAt: memory.timestamp,
                            id: memory.id
                        })));
                    }
                    break;
                case 'Assistants':
                    const assistantResponse = await doReadMemoryOp();
                    if (assistantResponse.statusCode === 200) {
                        const body = JSON.parse(assistantResponse.body);
                        const allAssistantMemories: UserMemoryResponse[] = body.memories.filter(
                            (memory: UserMemoryResponse) => memory.memory_type === 'assistant'
                        );

                        // Get unique assistant IDs
                        const uniqueAssistants: string[] = Array.from(new Set(
                            allAssistantMemories.map((memory: UserMemoryResponse) => memory.memory_type_id)
                        ));

                        // Set the list of assistants
                        setMemories(uniqueAssistants.map((assistantId: string) => {
                            const assistantMemory = allAssistantMemories.find(
                                (memory: UserMemoryResponse) => memory.memory_type_id === assistantId
                            );
                            return {
                                MemoryItem: `Assistant ${assistantId}`,
                                MemoryType: 'assistant',
                                MemoryTypeID: assistantId,
                                CreatedAt: assistantMemory?.timestamp || '',
                                id: assistantId
                            } as Memory;
                        }));

                        // If an assistant is selected, set its memories
                        if (selectedAssistant) {
                            const filteredAssistantMemories = allAssistantMemories.filter(
                                (memory: UserMemoryResponse) => memory.memory_type_id === selectedAssistant
                            );
                            setAssistantMemories(filteredAssistantMemories.map((memory: UserMemoryResponse) => ({
                                MemoryItem: memory.content,
                                MemoryType: memory.memory_type,
                                MemoryTypeID: memory.memory_type_id,
                                CreatedAt: memory.timestamp,
                                id: memory.id
                            })));
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('Error loading memories:', error);
            setMemories([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMemories();
    }, [activeTab, userEmail, selectedProject, selectedAssistant]);

    const tableContent = isLoading ? (
        <tr>
            <td colSpan={2} className="text-center py-4">Loading...</td>
        </tr>
    ) : memories.length === 0 ? (
        <tr>
            <td colSpan={2} className="text-center py-4">No memories found</td>
        </tr>
    ) : (
        memories.map((memory, index) => (
            <tr key={memory.id} className="border-b dark:border-neutral-700">
                <td className="px-4 py-2">
                    {editingMemory === memory.id ? (
                        <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-1 border rounded dark:bg-neutral-700"
                        />
                    ) : (
                        memory.MemoryItem
                    )}
                </td>
                <td className="px-4 py-2">{new Date(memory.CreatedAt).toLocaleString()}</td>
                {activeTab === 'User' && (
                    <td className="px-4 py-2">
                        {editingMemory === memory.id ? (
                            <div className="space-x-2">
                                <button
                                    onClick={() => handleSaveEdit(memory.id)}
                                    className="text-green-600 hover:text-green-700"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => handleCancelEdit()}
                                    className="text-gray-600 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className="space-x-2">
                                <button
                                    onClick={() => handleEdit(memory)}
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(memory.MemoryTypeID)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </td>
                )}
            </tr>
        ))
    );

    if (!open) return null;

    const tabs = [
        { id: 'User' as const, label: 'User' },
        { id: 'Projects' as const, label: 'Projects' },
        { id: 'Assistants' as const, label: 'Assistants' }
    ];

    return (
        <Modal
            width={() => window.innerWidth * 0.62}
            height={() => window.innerHeight * 0.88}
            title="Memory Management"
            onCancel={onClose}
            onSubmit={onClose}
            submitLabel="Close"
            content={
                <div className="flex h-full">
                    <div className="w-48 border-r dark:border-neutral-700">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 
                                ${activeTab === tab.id ? 'bg-gray-200 dark:bg-neutral-600' : ''}`}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSelectedProject(null);
                                    setSelectedAssistant(null);
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}

                        {/* Show project sub-tabs when Projects tab is active */}
                        {activeTab === 'Projects' && (
                            <div className="mt-4 border-t dark:border-neutral-700">
                                <div className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400">
                                    Projects
                                </div>
                                {memories.map((project) => (
                                    <button
                                        key={project.id}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 
                    ${selectedProject === project.id ? 'bg-gray-200 dark:bg-neutral-600' : ''}`}
                                        onClick={() => setSelectedProject(project.id)}
                                    >
                                        {project.MemoryItem}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Show assistant sub-tabs when Assistants tab is active */}
                        {activeTab === 'Assistants' && (
                            <div className="mt-4 border-t dark:border-neutral-700">
                                <div className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400">
                                    Assistants
                                </div>
                                {memories.map((assistant) => (
                                    <button
                                        key={assistant.id}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 
                    ${selectedAssistant === assistant.id ? 'bg-gray-200 dark:bg-neutral-600' : ''}`}
                                        onClick={() => setSelectedAssistant(assistant.id)}
                                    >
                                        {assistant.MemoryItem}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-4">
                        {activeTab === 'Projects' ? (
                            // Projects tab content
                            <div className="overflow-x-auto">
                                {selectedProject ? (
                                    <>
                                        <h2 className="text-xl mb-4">
                                            {memories.find(p => p.id === selectedProject)?.MemoryItem}
                                        </h2>
                                        <table className="min-w-full border-collapse">
                                            <thead>
                                                <tr className="border-b dark:border-neutral-700">
                                                    <th className="px-4 py-2 text-left">Memory</th>
                                                    <th className="px-4 py-2 text-left">Created At</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {projectMemories.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={2} className="text-center py-4">
                                                            No memories for this project
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    projectMemories.map((memory) => (
                                                        <tr key={memory.id} className="border-b dark:border-neutral-700">
                                                            <td className="px-4 py-2">{memory.MemoryItem}</td>
                                                            <td className="px-4 py-2">
                                                                {new Date(memory.CreatedAt).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </>
                                ) : (
                                    <div className="text-center py-4">
                                        Select a project from the sidebar to view its memories
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'Assistants' ? (
                            // Assistants tab content
                            <AssistantContent
                                selectedAssistant={selectedAssistant}
                                memories={memories}
                                assistantMemories={assistantMemories}
                            />
                        ) : (
                            // User tab content
                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse">
                                    <thead>
                                        <tr className="border-b dark:border-neutral-700">
                                            <th className="px-4 py-2 text-left">Memory</th>
                                            <th className="px-4 py-2 text-left">Created At</th>
                                            {activeTab === 'User' && (
                                                <th className="px-4 py-2 text-left">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableContent}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            }
        />
    );
};