import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Autocomplete } from './Autocomplete';

interface TagsInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TagsInput({ value, onChange, disabled = false }: TagsInputProps) {
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    fetchExistingTags();
  }, []);

  const fetchExistingTags = async () => {
    // Fetch all time entries and extract unique tags
    const { data } = await supabase
      .from('time_entries')
      .select('tags')
      .not('tags', 'is', null);

    if (data) {
      // Extract and flatten all tags from entries
      const allTags = new Set<string>();
      data.forEach((entry: { tags: string }) => {
        if (entry.tags) {
          // Split by comma and trim each tag
          entry.tags.split(',').forEach((tag: string) => {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
              allTags.add(trimmedTag);
            }
          });
        }
      });
      
      // Convert to sorted array
      setExistingTags(Array.from(allTags).sort());
    }
  };

  return (
    <Autocomplete
      value={value}
      onChange={onChange}
      suggestions={existingTags}
      placeholder="Tags (comma separated)"
      disabled={disabled}
      multiple={true}
    />
  );
}
