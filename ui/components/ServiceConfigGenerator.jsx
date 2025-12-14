"use client";

import { useState, useMemo } from 'react';
import { Download, Copy, Check, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './ServiceConfigGenerator.module.css';

// Configuration options
const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'ruby', label: 'Ruby' },
];

const FRAMEWORKS = {
  javascript: [
    { value: 'express', label: 'Express' },
    { value: 'fastify', label: 'Fastify' },
    { value: 'nextjs', label: 'Next.js' },
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
    { value: 'svelte', label: 'Svelte' },
  ],
  typescript: [
    { value: 'express', label: 'Express' },
    { value: 'fastify', label: 'Fastify' },
    { value: 'nextjs', label: 'Next.js' },
    { value: 'nestjs', label: 'NestJS' },
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
    { value: 'svelte', label: 'Svelte' },
  ],
  python: [
    { value: 'fastapi', label: 'FastAPI' },
    { value: 'django', label: 'Django' },
    { value: 'flask', label: 'Flask' },
  ],
  go: [
    { value: 'gin', label: 'Gin' },
    { value: 'gorilla', label: 'Gorilla Mux' },
    { value: 'fiber', label: 'Fiber' },
    { value: 'echo', label: 'Echo' },
  ],
  rust: [
    { value: 'actix', label: 'Actix Web' },
    { value: 'rocket', label: 'Rocket' },
    { value: 'axum', label: 'Axum' },
  ],
  java: [
    { value: 'spring', label: 'Spring Boot' },
    { value: 'quarkus', label: 'Quarkus' },
    { value: 'micronaut', label: 'Micronaut' },
  ],
  cpp: [],
  ruby: [
    { value: 'rails', label: 'Ruby on Rails' },
    { value: 'sinatra', label: 'Sinatra' },
  ],
};

const DATABASES = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'redis', label: 'Redis' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'elasticsearch', label: 'Elasticsearch' },
];

const QUEUES = [
  { value: 'rabbitmq', label: 'RabbitMQ' },
  { value: 'kafka', label: 'Kafka' },
  { value: 'redis', label: 'Redis (Bull/Celery)' },
  { value: 'sqs', label: 'AWS SQS' },
];

const DEFAULT_SERVICE = {
  name: '',
  path: '.',
  has_dockerfile: false,
  language: '',
  framework: '',
  ports: [],
  databases: [],
  queues: [],
};

export default function ServiceConfigGenerator() {
  const [services, setServices] = useState([{ ...DEFAULT_SERVICE, name: 'main' }]);
  const [expandedService, setExpandedService] = useState(0);
  const [copied, setCopied] = useState(false);
  const [portInput, setPortInput] = useState('');

  // Generate the JSON output
  const generatedJson = useMemo(() => {
    const servicesObj = {};
    const allLanguages = new Set();

    services.forEach(service => {
      if (service.name) {
        servicesObj[service.name] = {
          path: service.path || '.',
          has_dockerfile: service.has_dockerfile,
          language: service.language || 'unknown',
          framework: service.framework || null,
          ports: service.ports,
          databases: service.databases,
          queues: service.queues,
        };
        if (service.language) {
          allLanguages.add(service.language);
        }
      }
    });

    const primaryLanguage = services[0]?.language || 'unknown';

    return {
      services: servicesObj,
      service_count: Object.keys(servicesObj).length,
      languages: Array.from(allLanguages),
      primary_language: primaryLanguage,
    };
  }, [services]);

  const updateService = (index, field, value) => {
    setServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Reset framework if language changes
      if (field === 'language') {
        updated[index].framework = '';
      }
      return updated;
    });
  };

  const toggleArrayItem = (index, field, value) => {
    setServices(prev => {
      const updated = [...prev];
      const currentArray = updated[index][field] || [];
      if (currentArray.includes(value)) {
        updated[index] = { ...updated[index], [field]: currentArray.filter(v => v !== value) };
      } else {
        updated[index] = { ...updated[index], [field]: [...currentArray, value] };
      }
      return updated;
    });
  };

  const addPort = (index) => {
    const port = parseInt(portInput, 10);
    if (port && port > 0 && port <= 65535) {
      setServices(prev => {
        const updated = [...prev];
        const currentPorts = updated[index].ports || [];
        if (!currentPorts.includes(port)) {
          updated[index] = { ...updated[index], ports: [...currentPorts, port] };
        }
        return updated;
      });
      setPortInput('');
    }
  };

  const removePort = (index, port) => {
    setServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ports: updated[index].ports.filter(p => p !== port) };
      return updated;
    });
  };

  const addService = () => {
    setServices(prev => [...prev, { ...DEFAULT_SERVICE, name: `service-${prev.length + 1}` }]);
    setExpandedService(services.length);
  };

  const removeService = (index) => {
    if (services.length > 1) {
      setServices(prev => prev.filter((_, i) => i !== index));
      setExpandedService(Math.max(0, expandedService - 1));
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(generatedJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service_profile.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(generatedJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getAvailableFrameworks = (language) => {
    return FRAMEWORKS[language] || [];
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Service Configuration</h2>
        <p className={styles.subtitle}>
          Configure your project&apos;s services manually. The generated JSON can be used with the InFoundry pipeline.
        </p>
      </div>

      <div className={styles.layout}>
        {/* Services Configuration */}
        <div className={styles.configPanel}>
          <div className={styles.servicesHeader}>
            <h3 className={styles.sectionTitle}>Services</h3>
            <button className={styles.addBtn} onClick={addService}>
              <Plus size={16} />
              Add Service
            </button>
          </div>

          <div className={styles.servicesList}>
            {services.map((service, index) => (
              <div key={index} className={styles.serviceCard}>
                <div
                  className={styles.serviceHeader}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedService(expandedService === index ? -1 : index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedService(expandedService === index ? -1 : index);
                    }
                  }}
                >
                  <span className={styles.serviceName}>
                    {service.name || `Service ${index + 1}`}
                    {service.language && (
                      <span className={styles.serviceBadge}>{service.language}</span>
                    )}
                  </span>
                  <div className={styles.serviceActions}>
                    {services.length > 1 && (
                      <button
                        className={styles.deleteBtn}
                        onClick={(e) => { e.stopPropagation(); removeService(index); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {expandedService === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {expandedService === index && (
                  <div className={styles.serviceBody}>
                    {/* Name & Path */}
                    <div className={styles.row}>
                      <div className={styles.inputGroup}>
                        <label className={styles.label}>Service Name</label>
                        <input
                          type="text"
                          className={styles.input}
                          value={service.name}
                          onChange={(e) => updateService(index, 'name', e.target.value)}
                          placeholder="main"
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.label}>Path</label>
                        <input
                          type="text"
                          className={styles.input}
                          value={service.path}
                          onChange={(e) => updateService(index, 'path', e.target.value)}
                          placeholder="."
                        />
                      </div>
                    </div>

                    {/* Dockerfile toggle */}
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={service.has_dockerfile}
                        onChange={(e) => updateService(index, 'has_dockerfile', e.target.checked)}
                      />
                      <span className={styles.toggleSlider}></span>
                      <span className={styles.toggleLabel}>Has Dockerfile</span>
                    </label>

                    {/* Language */}
                    <div className={styles.optionGroup}>
                      <label className={styles.label}>Language</label>
                      <div className={styles.checkboxGrid}>
                        {LANGUAGES.map(lang => (
                          <label key={lang.value} className={styles.checkbox}>
                            <input
                              type="radio"
                              name={`language-${index}`}
                              checked={service.language === lang.value}
                              onChange={() => updateService(index, 'language', lang.value)}
                            />
                            <span className={styles.checkmark}></span>
                            <span>{lang.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Framework (conditional) */}
                    {service.language && getAvailableFrameworks(service.language).length > 0 && (
                      <div className={styles.optionGroup}>
                        <label className={styles.label}>Framework</label>
                        <div className={styles.checkboxGrid}>
                          {getAvailableFrameworks(service.language).map(fw => (
                            <label key={fw.value} className={styles.checkbox}>
                              <input
                                type="radio"
                                name={`framework-${index}`}
                                checked={service.framework === fw.value}
                                onChange={() => updateService(index, 'framework', fw.value)}
                              />
                              <span className={styles.checkmark}></span>
                              <span>{fw.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ports */}
                    <div className={styles.optionGroup}>
                      <label className={styles.label}>Ports</label>
                      <div className={styles.portInput}>
                        <input
                          type="number"
                          className={styles.input}
                          value={portInput}
                          onChange={(e) => setPortInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addPort(index)}
                          placeholder="e.g. 3000"
                          min="1"
                          max="65535"
                        />
                        <button className={styles.addPortBtn} onClick={() => addPort(index)}>
                          <Plus size={14} />
                        </button>
                      </div>
                      {service.ports.length > 0 && (
                        <div className={styles.portTags}>
                          {service.ports.map(port => (
                            <span key={port} className={styles.portTag}>
                              {port}
                              <button onClick={() => removePort(index, port)}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Databases */}
                    <div className={styles.optionGroup}>
                      <label className={styles.label}>Databases</label>
                      <div className={styles.checkboxGrid}>
                        {DATABASES.map(db => (
                          <label key={db.value} className={styles.checkbox}>
                            <input
                              type="checkbox"
                              checked={service.databases.includes(db.value)}
                              onChange={() => toggleArrayItem(index, 'databases', db.value)}
                            />
                            <span className={styles.checkmark}></span>
                            <span>{db.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Message Queues */}
                    <div className={styles.optionGroup}>
                      <label className={styles.label}>Message Queues</label>
                      <div className={styles.checkboxGrid}>
                        {QUEUES.map(queue => (
                          <label key={queue.value} className={styles.checkbox}>
                            <input
                              type="checkbox"
                              checked={service.queues.includes(queue.value)}
                              onChange={() => toggleArrayItem(index, 'queues', queue.value)}
                            />
                            <span className={styles.checkmark}></span>
                            <span>{queue.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* JSON Preview */}
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <h3 className={styles.sectionTitle}>Generated JSON</h3>
            <div className={styles.previewActions}>
              <button className={styles.actionBtn} onClick={copyToClipboard}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button className={styles.actionBtn} onClick={downloadJson}>
                <Download size={16} />
                Download
              </button>
            </div>
          </div>
          <pre className={styles.jsonPreview}>
            <code>{JSON.stringify(generatedJson, null, 2)}</code>
          </pre>
          
          <div className={styles.instructions}>
            <h4>How to use:</h4>
            <ol>
              <li>Configure your services above</li>
              <li>Download the <code>service_profile.json</code> file</li>
              <li>Create a <code>.infoundry</code> folder in your repository root</li>
              <li>Place the JSON file inside: <code>.infoundry/service_profile.json</code></li>
              <li>Run the InFoundry pipeline - it will use your configuration!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
