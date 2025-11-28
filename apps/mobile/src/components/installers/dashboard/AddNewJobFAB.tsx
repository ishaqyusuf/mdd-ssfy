import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export function AddNewJobFAB() {
  return (
    <TouchableOpacity
      className="absolute bottom-6 right-6 bg-primary-deep-blue rounded-full w-16 h-16 items-center justify-center shadow-lg active:bg-primary-medium-blue"
      onPress={() => {
        // TODO: Handle add new job action
        console.log('Add new job');
      }}
    >
      <MaterialIcons name="add" size={32} color="white" />
    </TouchableOpacity>
  );
}
